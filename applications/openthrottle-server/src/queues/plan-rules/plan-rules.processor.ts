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
 * re-established every pass rather than frozen at first apply. A matched rule
 * whose row stopped pointing at a live result — 'applied' with a NULL task
 * (deleted) or 'orphaned' (re-matched) — is handed to reinject() so it is not a
 * permanent no-op.
 *
 * Precedence: inject-task matches that would inject the same skill at the
 * same placement are arbitrated by specificity (see ActionExecutor); the loser
 * is ledgered 'flagged' {reason:'superseded-by', ruleId: <winner>} and never
 * dispatched or re-injected.
 *
 * The plan owner is resolved from plan.author (GitHub username → users row);
 * a plan whose author has no user row has no rules and is skipped.
 *
 * The evaluation environment comes from the job data (`environment`, set by the
 * trigger that knows it: `ci | interactive | ralph`). An environment-qualified
 * rule matches only a pass carrying that environment; a null-environment pass
 * (a trigger that does not know its environment) skips every qualified rule,
 * which then applies on a pass for its environment or on a qualified
 * plan-context read. As of this writing no trigger knows its environment, so
 * every pass is null and environment-qualified rules take effect only on
 * qualified plan-context reads; a trigger opts in by passing its environment
 * to enqueueEvaluation.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type OrphanedTaskStatusCaptureParams,
  PlansRepository,
  RULE_APPLICATION_STATES,
  RuleApplicationsRepository,
  SOFT_CLOSED_TASK_STATUS,
  TagActionRulesRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  evaluateTagActionRules,
  type TagActionRuleInput,
} from '@openthrottle/openthrottle-skills';

import { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import { WORK_LEDGER_CAPTURE_FAILED_MARKER } from '../../graphql/work-ledger/work-ledger.constants.ts';
import { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture/work-ledger-capture.service.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import { TagsService } from '../../services/tags/tags.service.ts';
import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import {
  PLAN_RULES_QUEUE_NAME,
  PLAN_RULES_WORKER_CONCURRENCY,
} from './plan-rules.constants.ts';
import type {
  PlanRulesEvaluateJob,
  PlanRulesEvaluateJobResult,
} from './plan-rules.types.ts';
import { findSupersededInjectTasks } from './plan-rules.utils.ts';

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
    private readonly notifications: NotificationsService,
    private readonly plansRepository: PlansRepository,
    private readonly ruleApplicationsRepository: RuleApplicationsRepository,
    private readonly statusChangeSystemAccount: StatusChangeSystemAccountService,
    private readonly tagActionRulesRepository: TagActionRulesRepository,
    private readonly tagsService: TagsService,
    private readonly usersRepository: UsersRepository,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
  ) {
    super();
  }

  /**
   * @description {@link OrphanedTaskStatusCapture} supplied to
   * `orphanUnmatchedApplications`: captures one `status_change` artifact per task that call
   * soft-closes, inside the SAME transaction (`params.manager`) as the ledger flip and the task
   * write. This worker has no request principal (jobs carry only `{environment, planId, triggerKind}`), so
   * attribution is the `status-change-system` service account, same as the stale-run sweeper and
   * `InjectTaskExecutor`'s revive path. Non-fatal: a ledger hiccup must not fail the whole
   * evaluation pass over a capture error.
   */
  private async captureOrphanedTaskStatusChange(
    params: OrphanedTaskStatusCaptureParams,
  ): Promise<void> {
    const actorSub = await this.statusChangeSystemAccount.resolveId();

    try {
      await this.workLedgerCapture.recordStatusChange(params.manager, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        entity: 'task',
        from: params.fromStatus,
        id: params.taskId,
        planId: params.planId,
        taskId: params.taskId,
        to: SOFT_CLOSED_TASK_STATUS,
      });
    } catch (error) {
      this.logger.error(
        `${WORK_LEDGER_CAPTURE_FAILED_MARKER} entity=task id=${params.taskId} from=${params.fromStatus} to=${SOFT_CLOSED_TASK_STATUS}: ${String(error)}`,
        PlanRulesProcessor.name,
      );
    }
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
    const { environment, planId, triggerKind } = job.data;

    const plan = await this.plansRepository.findOne({ where: { id: planId } });
    if (plan == null) {
      return {
        dispatched: 0,
        matched: 0,
        orphaned: 0,
        reconciled: 0,
        reinjected: 0,
        skipped: 'plan-missing',
      };
    }

    const owner = await this.usersRepository.findByGithubUsername(plan.author);
    if (owner == null) {
      const message = `Plan ${planId} author "${plan.author}" has no user row; no rules to evaluate`;

      this.logger.debug(message, PlanRulesProcessor.name);

      return {
        dispatched: 0,
        matched: 0,
        orphaned: 0,
        reconciled: 0,
        reinjected: 0,
        skipped: 'no-owner',
      };
    }

    const [effectiveTags, rules] = await Promise.all([
      this.tagsService.getEffectiveTagSet(planId),
      this.tagActionRulesRepository.listEnabledForUser(owner.id),
    ]);

    const ruleInputs: TagActionRuleInput[] = rules.map((rule) => ({
      actionPayload: rule.actionPayload,
      actionType: rule.actionType,
      createdAt: rule.createdAt,
      enabled: rule.enabled,
      environment: rule.environment,
      id: rule.id,
      projectId: rule.projectId,
      repositoryId: rule.repositoryId,
      status: rule.status,
      tagAll: rule.tagAll,
    }));

    const matched = evaluateTagActionRules(
      {
        effectiveTags: effectiveTags.map((tag) => tag.tag),
        environment,
        planStatus: plan.status,
        projectId: plan.projectId,
        repositoryId: plan.repositoryId,
      },
      ruleInputs,
    );

    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    const fingerprints = await Promise.all(
      matched.map((action) =>
        this.ruleApplicationsRepository.findByRuleAndPlan(
          action.ruleId,
          planId,
        ),
      ),
    );

    // Same-skill, same-placement inject-task matches: only the narrowest is
    // dispatched. Computed over ALL matches (applied or not).
    const superseded = findSupersededInjectTasks(matched);

    // A loser with no ledger row yet gets a visible 'flagged' row naming the
    // winner; the apply-once fingerprint then keeps it from being rewritten.
    await Promise.all(
      matched.flatMap((action, index) => {
        const winnerRuleId = superseded.get(action.ruleId);
        if (winnerRuleId == null || fingerprints[index] != null) {
          return [];
        }

        return [
          this.ruleApplicationsRepository.record({
            details: { reason: 'superseded-by', ruleId: winnerRuleId },
            planId,
            ruleId: action.ruleId,
            state: RULE_APPLICATION_STATES.FLAGGED,
          }),
        ];
      }),
    );

    const fresh = matched.filter(
      (action, index) =>
        fingerprints[index] == null && !superseded.has(action.ruleId),
    );

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

    // Re-injection: a matched rule whose ledger row stopped pointing at a live
    // result — 'applied' with a NULL task (the injected task was deleted) or
    // 'orphaned' (un-matched then matched again). Without this such a row is a
    // permanent no-op. Sequential for the same UNIQUE(plan_id, sort_order)
    // safety as reconcile.
    const reinjectable = matched.flatMap((action, index) => {
      const application = fingerprints[index];
      if (application == null || superseded.has(action.ruleId)) return [];
      const deletedApplied =
        application.state === RULE_APPLICATION_STATES.APPLIED &&
        application.taskId == null;
      const orphaned = application.state === RULE_APPLICATION_STATES.ORPHANED;
      if (!deletedApplied && !orphaned) return [];
      const executor = this.executorRegistry.get(action.actionType);
      const rule = rulesById.get(action.ruleId);
      if (executor?.reinject == null || rule == null) return [];
      return [{ action, application, executor, rule }];
    });

    await reinjectable.reduce<Promise<void>>(
      (chain, { action, application, executor, rule }) =>
        chain.then(() =>
          executor.reinject?.({
            action,
            application,
            ownerUserId: owner.id,
            plan,
            rule,
          }),
        ),
      Promise.resolve(),
    );
    const reinjected = reinjectable.length;
    // The capture runs inside orphanUnmatchedApplications' transaction, so only collect there and
    // publish once it has committed: a rollback must never announce a soft-close.
    const softClosedTaskIds: string[] = [];
    const orphaned =
      await this.ruleApplicationsRepository.orphanUnmatchedApplications(
        planId,
        matched.map((action) => action.ruleId),
        async (capture) => {
          await this.captureOrphanedTaskStatusChange(capture);
          softClosedTaskIds.push(capture.taskId);
        },
      );

    for (const taskId of softClosedTaskIds) {
      this.notifications.emitTaskStatusChanged({
        planId,
        status: SOFT_CLOSED_TASK_STATUS,
        taskId,
      });
    }

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
      reinjected,
      skipped: null,
    };
  }
}
