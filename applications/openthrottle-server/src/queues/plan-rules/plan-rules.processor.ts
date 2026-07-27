/**
 * @description BullMQ worker for plan-rules:evaluate. One job = one full
 * evaluation pass for a plan: load plan + effective tag set (slice-2 rollup),
 * load the plan owner's enabled rules, run the pure evaluator, dispatch
 * matched actions to the {@link ActionExecutorRegistry}, reconcile the managed
 * invariants of already-'applied' matched rows, and flip un-matched 'applied'
 * ledger rows to 'orphaned'. The shared fingerprint check happens here (a
 * ledger row in ANY state for (rule, plan) means no fresh dispatch), so
 * at-least-once redelivery is safe regardless of executor behavior.
 *
 * A matched rule with no ledger row is dispatched fresh (execute); a matched
 * rule already 'applied' with a live task is handed to the executor's optional
 * reconcile() so continuous invariants (e.g. inject-task placement) are
 * re-established every pass rather than frozen at first apply.
 *
 * The plan owner is resolved from plan.author (GitHub username → users row);
 * a plan whose author has no user row has no rules and is skipped. The v1
 * worker evaluates with environment=null, so environment-qualified rules only
 * match on qualified read paths (plan-context availability), not here.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import {
  PlansService,
  RULE_APPLICATION_STATES,
  RuleApplicationsService,
  TagActionRulesService,
  TagsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import {
  evaluateTagActionRules,
  type TagActionRuleInput,
} from '@openthrottle/openthrottle-skills';
import { ActionExecutorRegistry } from './action-executor';
import {
  PLAN_RULES_QUEUE_NAME,
  PLAN_RULES_WORKER_CONCURRENCY,
} from './plan-rules.constants';
import type {
  PlanRulesEvaluateJob,
  PlanRulesEvaluateJobResult,
} from './plan-rules.types';

@Processor(PLAN_RULES_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: PLAN_RULES_WORKER_CONCURRENCY,
})
export class PlanRulesProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly executorRegistry: ActionExecutorRegistry,
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
    private readonly ruleApplicationsService: RuleApplicationsService,
    private readonly tagActionRulesService: TagActionRulesService,
    private readonly tagsService: TagsService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Plan rules worker started (concurrency=${PLAN_RULES_WORKER_CONCURRENCY})`,
      PlanRulesProcessor.name,
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.worker.close();
  }

  async process(
    job: PlanRulesEvaluateJob,
  ): Promise<PlanRulesEvaluateJobResult> {
    const { planId, triggerKind } = job.data;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: planId } });
    if (plan == null) {
      return {
        dispatched: 0,
        matched: 0,
        orphaned: 0,
        reconciled: 0,
        skipped: 'plan-missing',
      };
    }

    const owner = await this.usersService.findByGithubUsername(plan.author);
    if (owner == null) {
      const message = `Plan ${planId} author "${plan.author}" has no user row; no rules to evaluate`;

      this.logger.debug(message, PlanRulesProcessor.name);

      return {
        dispatched: 0,
        matched: 0,
        orphaned: 0,
        reconciled: 0,
        skipped: 'no-owner',
      };
    }

    const [effectiveTags, rules] = await Promise.all([
      this.tagsService.getEffectiveTagSet(planId),
      this.tagActionRulesService.listEnabledForUser(owner.id),
    ]);

    const ruleInputs: TagActionRuleInput[] = rules.map((rule) => ({
      actionPayload: rule.actionPayload,
      actionType: rule.actionType,
      enabled: rule.enabled,
      environment: rule.environment,
      id: rule.id,
      projectId: rule.projectId,
      status: rule.status,
      tagAll: rule.tagAll,
    }));

    const matched = evaluateTagActionRules(
      {
        effectiveTags: effectiveTags.map((tag) => tag.tag),
        environment: null,
        planStatus: plan.status,
        projectId: plan.projectId,
      },
      ruleInputs,
    );

    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    const fingerprints = await Promise.all(
      matched.map((action) =>
        this.ruleApplicationsService.findByRuleAndPlan(action.ruleId, planId),
      ),
    );

    const fresh = matched.filter((_, index) => fingerprints[index] == null);

    const dispatchable = fresh.flatMap((action) => {
      const executor = this.executorRegistry.get(action.actionType);
      const rule = rulesById.get(action.ruleId);
      if (executor == null || rule == null) {
        this.logger.debug(
          `No executor registered for "${action.actionType}" (rule ${action.ruleId}, plan ${planId}); skipping without a ledger row`,
          PlanRulesProcessor.name,
        );

        return [];
      }

      return [{ action, executor, rule }];
    });

    await Promise.all(
      dispatchable.map(({ action, executor, rule }) =>
        executor.execute({
          action,
          ownerUserId: owner.id,
          plan,
          rule,
        }),
      ),
    );

    const dispatched = dispatchable.length;

    // Managed-invariant reconcile: for matched rules whose ledger row is already
    // 'applied' with a live task, re-establish the action's invariant against the
    // current plan state (inject-task repositions its task to its placement).
    // Fresh rules (just dispatched above) have no applied row yet, so they are
    // naturally excluded. Reconciles run sequentially so two placement writes in
    // one pass never race each other on UNIQUE(plan_id, sort_order); per-plan
    // pass serialization (dedup) guards against a sibling pass.
    const reconcilable = matched.flatMap((action, index) => {
      const application = fingerprints[index];
      if (
        application == null ||
        application.state !== RULE_APPLICATION_STATES.APPLIED ||
        application.taskId == null
      ) {
        return [];
      }
      const executor = this.executorRegistry.get(action.actionType);
      const rule = rulesById.get(action.ruleId);
      if (executor?.reconcile == null || rule == null) {
        return [];
      }
      return [{ action, application, executor, rule }];
    });

    // Sequential (promise chain, not Promise.all) so two placement writes in the
    // same pass never collide on UNIQUE(plan_id, sort_order); the set is tiny
    // (one row per injected task on the plan).
    await reconcilable.reduce<Promise<void>>(
      (chain, { action, application, executor, rule }) =>
        chain.then(() =>
          executor.reconcile?.({
            action,
            application,
            ownerUserId: owner.id,
            plan,
            rule,
          }),
        ),
      Promise.resolve(),
    );
    const reconciled = reconcilable.length;
    const orphaned =
      await this.ruleApplicationsService.orphanUnmatchedApplications(
        planId,
        matched.map((action) => action.ruleId),
      );

    if (orphaned > 0) {
      this.logger.info(
        `Orphaned ${orphaned} rule application(s) on plan ${planId} (trigger: ${triggerKind})`,
        PlanRulesProcessor.name,
      );
    }

    return {
      dispatched,
      matched: matched.length,
      orphaned,
      reconciled,
      skipped: null,
    };
  }
}
