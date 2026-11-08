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
  /**
   * @description Optional re-establish pass for a matched rule whose ledger row
   * has stopped pointing at a live result: an 'applied' row whose task was
   * deleted (task_id NULL) or an 'orphaned' row whose rule matches again. The
   * worker calls this so a still-matching rule is not a permanent no-op.
   * inject-task uses it to re-inject (or revive) the injected task and move the
   * row back to 'applied'. Executors whose action cannot be undone omit it.
   */
  reinject?(context: ActionReconcileContext): Promise<void>;
}
