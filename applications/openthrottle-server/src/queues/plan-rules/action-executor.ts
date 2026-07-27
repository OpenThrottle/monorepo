/**
 * @description The ActionExecutor seam between the plan-rules:evaluate worker
 * and concrete rule actions. Executors are registered per action type on the
 * {@link ActionExecutorRegistry}; the worker performs the shared fingerprint
 * check (any rule_applications row for (rule_id, plan_id) → no-op) BEFORE
 * dispatch, so an executor only runs for first-time (rule, plan) pairs. The
 * executor owns the rest of the contract: pre-satisfied detection, gating
 * (write 'flagged' + details), performing the action, and writing 'applied'.
 * Actions are NEVER undone — un-matching flips the ledger row to 'orphaned'
 * (worker-side), nothing else. See docs/monorepo/plan-task-tags-rules-design.md
 * ("Executor contract").
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  RuleApplication,
  TagActionRule,
} from '@openthrottle/nestjs-repositories';
import type {
  MatchedTagAction,
  TagActionType,
} from '@openthrottle/openthrottle-skills';

export interface ActionExecutorContext {
  readonly action: MatchedTagAction;
  /** The plan owner (rule owner) — users.id resolved from plan.author. */
  readonly ownerUserId: string;
  readonly plan: Plan;
  readonly rule: TagActionRule;
}

/**
 * @description Context for {@link ActionExecutor.reconcile}: the same inputs as
 * {@link ActionExecutorContext} plus the existing 'applied' ledger row (its
 * `taskId` points at the task the action produced).
 */
export interface ActionReconcileContext extends ActionExecutorContext {
  readonly application: RuleApplication;
}

export interface ActionExecutor {
  readonly actionType: TagActionType;
  execute(context: ActionExecutorContext): Promise<void>;
  /**
   * @description Optional managed-invariant pass for an already-'applied' (rule,
   * plan). The worker calls this every evaluation for matched rules whose ledger
   * row is 'applied' with a live task, so the executor can re-establish any
   * invariant that depends on the current plan state. inject-task uses it to
   * reconcile the injected task's sort_order back to its configured placement
   * (e.g. keep a 'last' task last as new tasks are added). Executors without a
   * continuous invariant omit it.
   */
  reconcile?(context: ActionReconcileContext): Promise<void>;
}

/**
 * @description Action-type → executor lookup. Concrete executors (inject-task,
 * availability-exception) register themselves at module init; a matched action
 * with no registered executor is logged and skipped WITHOUT a ledger row, so
 * the action applies retroactively once its executor ships.
 */
@Injectable()
export class ActionExecutorRegistry {
  private readonly executors = new Map<TagActionType, ActionExecutor>();

  constructor(private readonly logger: LoggerService) {}

  register(executor: ActionExecutor): void {
    if (this.executors.has(executor.actionType)) {
      this.logger.warn(
        `Replacing action executor for "${executor.actionType}"`,
        ActionExecutorRegistry.name,
      );
    }
    this.executors.set(executor.actionType, executor);
  }

  get(actionType: TagActionType): ActionExecutor | undefined {
    return this.executors.get(actionType);
  }
}
