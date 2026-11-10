import * as os from 'node:os';

import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import {
  Inject,
  OnApplicationShutdown,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun, PlanRunStatus } from '@openthrottle/nestjs-repositories';
import {
  HEARTBEAT_INTERVAL_MS,
  PLAN_RUN_STARTABLE_STATUSES,
  PLAN_RUN_STATUS,
  PlanOutputStreamService,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { getWorkflowConfigCwd } from '@openthrottle/openthrottle-agentic-utils';
import {
  isLifecycleHooksChildJobsEnabled,
  WORKFLOW_EVENT,
} from '@openthrottle/openthrottle-agentic-workflow';
import { loadWorkflowRalphConfig } from '@tools/workflows';
import type { Queue } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { In } from 'typeorm';

import { PlanStatusService } from '../../graphql/plans/plan-status/plan-status.service.ts';
import { SettleRunLedgerService } from '../../graphql/work-ledger/settle-run-ledger/settle-run-ledger.service.ts';
import { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import { ProcessMetricsService } from '../../metrics/process-metrics/process-metrics.service.ts';
import type {
  EnhancedTaskRunMetrics,
  ProcessMetricsSnapshot,
} from '../../metrics/process-metrics/process-metrics.types.ts';
import { formatEnhancedTaskRunMetricsSummary } from '../../metrics/process-metrics/process-metrics.utils.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import { PlanRunWorktreeCleanupService } from '../../services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.service.ts';
import type { ProvisionedPlanRunWorktree } from '../../services/plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import { isRunPlanOrchestratorJobData } from '../agentic-ralph/agentic-ralph.utils.ts';
import { AgenticRalphOrchestratorService } from '../agentic-ralph/orchestrator/orchestrator.service.ts';
import { closeRunOutputForJob } from '../bullmq-keyed-run-logging/bullmq-keyed-run-logging.utils.ts';
import { BULLMQ_RUN_OUTPUT_WRITER } from '../bullmq-run-output/bullmq-run-output-writer.token.ts';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output/retention/retention.service.ts';
import type { PlanQueueJobCompletedPayload } from '../job-run-hooks/job-run-hooks.types.ts';
import {
  runAfterAllHooksWithDispatcherThenNotify,
  runAfterRunHooksThenNotify,
  runBeforeAllHooksWithDispatcher,
  runBeforeRunHooksAndHandleBlock,
} from '../job-run-hooks/job-run-hooks.utils.ts';
// import { DelayedError } from 'bullmq';
import { WorkflowLifecycleDispatcherFactory } from '../plan-lifecycle-hooks/workflow-lifecycle-dispatcher/workflow-lifecycle-dispatcher.service.ts';
import { resolveRepeatablesOwner } from '../repeatable-job/repeatable-job.utils.ts';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
  // WORKTREE_RETRY_DELAY_MS,
} from './plans.constants.ts';
import type {
  PlanRunJobResult,
  RunPlanJob,
  RunPlanJobData,
} from './plans.types.ts';
import type { PlanTaskCounts, PlanTaskOutcomeFields } from './plans.types.ts';
import {
  buildFinishedRunNotification,
  countPlanTasks,
  resolveIdlePlanStatus,
} from './plans.utils.ts';
import { PlanRunCancellationService } from './run-cancellation/run-cancellation.service.ts';
import { ScheduledPlanRunService } from './scheduled-plan-run/scheduled-plan-run.service.ts';
import { UsageLimitResumeService } from './usage-limit-resume/usage-limit-resume.service.ts';
import { WorkLedgerRunService } from './work-ledger-run/work-ledger-run.service.ts';

const CONCURRENCY = 1;

/** Whether a worker may claim a run in `status` (see `PLAN_RUN_STARTABLE_STATUSES`). */
const isStartableRunStatus = (status: string): boolean => {
  return PLAN_RUN_STARTABLE_STATUSES.some((startable) => startable === status);
};

/**
 * Processes plan-run jobs for the plans queue. Concurrency is derived from the number
 * of configured worktrees (WORKTREE_TARGETS env), defaulting to 1 when no worktrees are configured.
 * When WORKTREE_TARGETS is set, runs the worktree workflow (acquire target → Ralph in worktree →
 * ensure commit → release). Jobs with {@link RunPlanJobData.runKind} `orchestrator` use the
 * in-process GraphQL orchestrator (no spawn, no worktree loop). Otherwise runs Ralph in the
 * process cwd (legacy spawn behavior).
 *
 * Stalled job recovery: we set lockDuration, stalledInterval, and maxStalledCount so long-running
 * Ralph jobs are renewed (every lockDuration/2) and, after server restart, interrupted jobs become
 * stalled and re-enter the waiting queue within ~lockDuration + stalledInterval.
 *
 * Runs that cannot progress end BLOCKED: when the orchestrator finishes with only BLOCKED tasks
 * left (`workflow_tasks_blocked`) or stops on its iteration/time limit with work left, the plan is
 * BLOCKED, never left IN_PROGRESS/QUEUED where it would look runnable forever. The orchestrator
 * writes that status itself; {@link PlansProcessor.settlePlanLeftOpenByRun} is the backstop, and
 * the notification names which of the two happened. Nothing re-queues a BLOCKED plan: a human
 * unblocks it and re-enqueues it.
 */
@Processor(PLANS_QUEUE_NAME, {
  concurrency: CONCURRENCY,
  /**
   * Sets a hard limit on how often a worker picks up new jobs,
   * effectively creating a forced delay between the completion of one job
   * and the start of another.
   */
  limiter: {
    duration: 2 * 60_000, // 2 minutes
    max: 1, // only one job at a time
  },
  lockDuration: PLANS_WORKER_LOCK_DURATION_MS,
  maxStalledCount: PLANS_WORKER_MAX_STALLED_COUNT,
  stalledInterval: PLANS_WORKER_STALLED_INTERVAL_MS,
})
export class PlansProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly agenticRalphOrchestrator: AgenticRalphOrchestratorService,
    private readonly bullMqRunOutputRetention: BullMqRunOutputRetentionService,
    @Optional()
    @Inject(BULLMQ_RUN_OUTPUT_WRITER)
    private readonly bullMqRunOutputWriter: KeyedJsonlWriter | undefined,
    private readonly lifecycleDispatcherFactory: WorkflowLifecycleDispatcherFactory,
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly planRunCancellation: PlanRunCancellationService,
    private readonly planRunWorktreeCleanup: PlanRunWorktreeCleanupService,
    private readonly planRunsService: PlanRunsService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, PlanRunJobResult | void>,
    private readonly plansService: PlansService,
    private readonly planStatusService: PlanStatusService,
    private readonly processMetrics: ProcessMetricsService,
    private readonly scheduledPlanRun: ScheduledPlanRunService,
    private readonly settleRunLedger: SettleRunLedgerService,
    private readonly statusChangeSystemAccount: StatusChangeSystemAccountService,
    private readonly tasksService: TasksService,
    private readonly usageLimitResume: UsageLimitResumeService,
    private readonly workLedgerRun: WorkLedgerRunService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.logger.info(
      `Plans worker stalled-job recovery: lockDuration=${PLANS_WORKER_LOCK_DURATION_MS}ms, stalledInterval=${PLANS_WORKER_STALLED_INTERVAL_MS}ms, maxStalledCount=${PLANS_WORKER_MAX_STALLED_COUNT}. Jobs interrupted by restart re-enter the queue within ~${(PLANS_WORKER_LOCK_DURATION_MS + PLANS_WORKER_STALLED_INTERVAL_MS) / 1000}s.`,
      PlansProcessor.name,
    );

    // Owner-only. A shared-DB worktree's plans queue is its own `bull:wt-<slug>` prefix, so it sees
    // no active job for ANY plan and would reset every IN_PROGRESS plan in the user's database.
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Plan status startup reconciliation skipped: ${ownership.reason}`,
        PlansProcessor.name,
      );
      return;
    }

    await this.reconcilePlanStatusOnStartup();
    await this.reconcilePlansQueuedWithInProgressTasks();
    await this.repairStrandedQueuedPlans();
    // Re-project SCHEDULED runs whose delayed job was lost (Redis flushed, volume recreated),
    // applying the grace window. Owner-only for the same reason as the two above. Never throws.
    await this.scheduledPlanRun.reconcileOnStartup();
  }

  /**
   * On startup, reset any plan that is IN_PROGRESS but has no active job in the queue (e.g. after server restart). Prevents plans from staying stuck as IN_PROGRESS when the job was interrupted.
   *
   * A plan whose newest run is a live detached run (an interactive /ot-loop or a workflow-ralph CLI
   * run — no BullMQ job by design) is left alone: that run lives outside this process, survives the
   * restart, and is settled by its owner or the sweeps, never by this reconcile.
   */
  private async reconcilePlanStatusOnStartup(): Promise<void> {
    const repo = this.plansService.getRepository();
    const plans = await repo.find({ where: { status: 'IN_PROGRESS' } });

    if (plans.length === 0) {
      return;
    }

    const activeJobs = await this.plansQueue.getJobs(['active'], 0, 500);
    const planIdsWithActiveJob = new Set(
      activeJobs
        .map((job) => job.data?.planId)
        .filter((id): id is string => typeof id === 'string'),
    );
    const planIdsWithLiveDetachedRun =
      await this.planRunsService.findPlanIdsWithLiveDetachedRun(
        plans.map((plan) => plan.id),
      );
    const orphaned = plans.filter((plan) => {
      if (planIdsWithActiveJob.has(plan.id)) {
        return false;
      }

      if (planIdsWithLiveDetachedRun.has(plan.id)) {
        this.logger.info(
          `Plan status reconciliation: leaving plan ${plan.id} IN_PROGRESS (live detached run, no BullMQ job by design).`,
          PlansProcessor.name,
        );
        return false;
      }

      return true;
    });

    if (orphaned.length === 0) {
      return;
    }

    const countsByPlan = await this.loadPlanTaskCounts(
      orphaned.map((plan) => plan.id),
    );
    const startupActorSub = await this.statusChangeSystemAccount.resolveId();

    for (const plan of orphaned) {
      // A plan whose tasks are all terminal or BLOCKED has nothing a re-run could do, so it settles
      // BLOCKED (or COMPLETED) instead of re-entering the queue it would otherwise hold forever.
      const target = resolveIdlePlanStatus(countsByPlan.get(plan.id));

      this.logger.info(
        `Plan status reconciliation: moving plan ${plan.id} from IN_PROGRESS to ${target} (no active job).`,
        PlansProcessor.name,
      );

      // Routed through the applyStatusChange chokepoint, attributed to the status-change-system
      // service account with a non-fatal capture failure (a missing migration/ledger hiccup must
      // not block a startup reconcile). guardCurrentStatus re-checks IN_PROGRESS under
      // writeGuardedStatus's own row lock — the `plans` list was read moments earlier, above.
      // eslint-disable-next-line no-await-in-loop
      await this.planStatusService.writeGuardedStatus(plan.id, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: startupActorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: target,
        throwOnForbiddenInProgress: false,
      });

      this.notifications.emitPlanStatusChanged({
        planId: plan.id,
        status: target,
      });
    }
  }

  /**
   * On startup, settle QUEUED plans that nothing will ever run: no waiting, prioritized or delayed
   * BullMQ job, no SCHEDULED run, no live detached run, and no workable task. Such a plan was
   * stranded by an earlier run that finished with only BLOCKED tasks left (before runs settled
   * those BLOCKED themselves), and it would otherwise hold its place in the queue forever. It is
   * written BLOCKED, or COMPLETED when no task remains. A QUEUED plan with any workable task is
   * left alone: it is waiting for a run, not stranded.
   */
  private async repairStrandedQueuedPlans(): Promise<void> {
    const plans = await this.plansService
      .getRepository()
      .find({ where: { status: 'QUEUED' } });

    if (plans.length === 0) {
      return;
    }

    const planIds = plans.map((plan) => plan.id);
    const [planIdsWithQueuedJob, scheduledByPlan, liveDetached, countsByPlan] =
      await Promise.all([
        this.findPlanIdsWithQueuedJob(undefined),
        this.planRunsService.findEarliestScheduledForByPlanIds(planIds),
        this.planRunsService.findPlanIdsWithLiveDetachedRun(planIds),
        this.loadPlanTaskCounts(planIds),
      ]);

    const stranded = planIds.flatMap((planId) => {
      if (
        planIdsWithQueuedJob.has(planId) ||
        scheduledByPlan.has(planId) ||
        liveDetached.has(planId)
      ) {
        return [];
      }

      const target = resolveIdlePlanStatus(countsByPlan.get(planId));

      return target === 'QUEUED' ? [] : [{ planId, target }];
    });

    if (stranded.length === 0) {
      return;
    }

    const actorSub = await this.statusChangeSystemAccount.resolveId();

    for (const { planId, target } of stranded) {
      this.logger.info(
        `Plan status reconciliation: moving stranded plan ${planId} from QUEUED to ${target} (no job, no workable task).`,
        PlansProcessor.name,
      );

      // eslint-disable-next-line no-await-in-loop
      const written = await this.planStatusService.writeGuardedStatus(planId, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: 'QUEUED',
        requestedStatus: target,
        throwOnForbiddenInProgress: false,
      });

      if (written) {
        this.notifications.emitPlanStatusChanged({ planId, status: target });
      }
    }
  }

  /**
   * On startup, promote QUEUED plans that still have IN_PROGRESS
   * tasks (e.g. after stall/requeue reset the plan but not tasks). Mirrors downward reconcile in {@link reconcilePlanStatusOnStartup}.
   *
   * A plan whose BullMQ job is DELAYED is skipped: a usage-limit continuation legitimately sits in
   * the delayed state for hours, and promoting its plan to IN_PROGRESS would make a paused plan read
   * as running (the delayed job promotes it itself when it starts).
   */
  private async reconcilePlansQueuedWithInProgressTasks(): Promise<void> {
    const planRepo = this.plansService.getRepository();
    const taskRepo = this.tasksService.getRepository();
    const plans = await planRepo.find({ where: { status: 'QUEUED' } });

    if (plans.length === 0) {
      return;
    }

    const delayedJobs = await this.plansQueue.getJobs(['delayed'], 0, 500);
    const planIdsWithDelayedJob = new Set(
      delayedJobs
        .map((job) => job.data?.planId)
        .filter((id): id is string => typeof id === 'string'),
    );

    const actorSub = await this.statusChangeSystemAccount.resolveId();

    for (const plan of plans) {
      if (planIdsWithDelayedJob.has(plan.id)) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const tasks = await taskRepo.findOne({
        select: ['id'],
        where: { planId: plan.id, status: 'IN_PROGRESS' },
      });

      if (!tasks) {
        continue;
      }

      const promoted =
        // eslint-disable-next-line no-await-in-loop
        await this.planStatusService.promoteParentPlanToInProgress(
          plan.id,
          {
            actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
            actorSub: actorSub ?? undefined,
          },
          false,
        );

      if (!promoted) {
        continue;
      }

      this.logger.info(
        `Plan status reconciliation: promoting plan ${plan.id} from QUEUED to IN_PROGRESS (task ${tasks.id} is IN_PROGRESS).`,
        PlansProcessor.name,
      );

      this.notifications.emitPlanStatusChanged({
        planId: plan.id,
        status: 'IN_PROGRESS',
      });
    }
  }

  /**
   * When a plan job attempt fails with a retry still to come, reset the plan status to QUEUED so it is not stuck as IN_PROGRESS. On the final attempt (retries exhausted, or an `UnrecoverableError`) the plan is set BLOCKED instead and the failure reason is written to its output stream, so it never reads QUEUED with no job behind it; the user re-enqueues once the cause is fixed.
   * Guarded on the job's plan_runs row: a SCHEDULED run whose admission threw never flipped the plan, so the plan is left alone (and the run settled FAILED once retries are exhausted); a row already settled elsewhere is left alone entirely; only a QUEUED / IN_PROGRESS row (or no row) takes the reset and the FAILED settle.
   * Handles both payload shapes: { job, error } (NestJS) or (job, error) as separate args from BullMQ Worker.
   */
  @OnWorkerEvent('failed')
  async onPlanJobFailed(
    payload: { error?: Error; job?: RunPlanJob } | RunPlanJob,
    errorArg?: Error,
  ): Promise<void> {
    const job: RunPlanJob | undefined =
      'data' in payload ? payload : payload.job;
    const error = ('error' in payload && payload.error) || errorArg;
    const planId = job?.data?.planId;

    if (typeof planId !== 'string') return;

    const run =
      job === undefined ? null : await this.findRunForJobSafe(String(job.id));
    const exhausted = job !== undefined && this.hasExhaustedRetries(job, error);

    // Admission threw before the fire-time claim committed (it is one transaction, so it rolled
    // back): the plan and its tasks were never flipped QUEUED and must not be now. A retry fires
    // the policy again; once none is left the run can never fire, so it settles FAILED rather than
    // sitting SCHEDULED behind a failed job the boot reconcile reads as present.
    if (run?.status === PLAN_RUN_STATUS.SCHEDULED) {
      if (exhausted) {
        await this.settleScheduledRunFailedSafe(run.id);
      }

      this.logger.warn(
        `Scheduled plan run ${run.id} failed before it could claim (plan ${planId}); plan status left as is${exhausted ? ', run settled FAILED' : ', will retry'}: ${error?.message ?? 'unknown error'}`,
        PlansProcessor.name,
      );

      return;
    }

    // Something else already settled the row (a cancel, the fire-time policy's MISSED /
    // SUPERSEDED, the stale sweeper): the job's failure is not this run's to report, and the plan
    // belongs to whatever settled it.
    if (run !== null && !isStartableRunStatus(run.status)) {
      this.logger.warn(
        `Plan job ${String(job?.id)} failed after its plan_runs row ${run.id} was already ${run.status}; leaving the row and plan ${planId} as they are: ${error?.message ?? 'unknown error'}`,
        PlansProcessor.name,
      );

      return;
    }

    // A retry is coming, so QUEUED is true: the plan is waiting on it. On the last attempt nothing
    // is coming, and QUEUED would advertise a run that will never happen.
    if (job !== undefined && exhausted) {
      await this.blockPlanAfterFinalFailure(
        planId,
        String(job.id),
        error?.message,
      );
    } else {
      await this.resetPlanStatusToQueued(planId, 'failed', error?.message);
    }

    // The retry boundary: 'failed' fires on EVERY attempt, but a retry is still going
    // to re-claim this row (via markRunStarted, back to IN_PROGRESS). Only settle the
    // plan_runs row to the terminal FAILED status once BullMQ will not retry again —
    // settling earlier would have a retry re-claim a row that already reads terminal.
    // Guarded on QUEUED / IN_PROGRESS, so a row settled between the read above and here keeps
    // its status.
    if (job !== undefined && exhausted) {
      await this.settleUnsettledRunFailedSafe(String(job.id));
    }
  }

  /**
   * After a job's final failed attempt: sets the plan BLOCKED (nothing will run it again) and
   * appends the failure reason to its output stream so the plan page says why. A plan that
   * another waiting job will pick up (a re-enqueue that landed meanwhile) is left as it is. Does
   * not throw; logs on failure.
   */
  private async blockPlanAfterFinalFailure(
    planId: string,
    jobId: string,
    detail: string | undefined,
  ): Promise<void> {
    try {
      const waiting = await this.findPlanIdsWithQueuedJob(jobId);

      if (waiting.has(planId)) {
        this.logger.info(
          `Plan job ${jobId} failed for the last time, but another job is waiting for plan ${planId}; leaving its status`,
          PlansProcessor.name,
        );

        return;
      }

      const actorSub = await this.statusChangeSystemAccount.resolveId();
      const written = await this.planStatusService.writeGuardedStatus(planId, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: undefined,
        requestedStatus: 'BLOCKED',
        throwOnForbiddenInProgress: false,
      });

      if (!written) return;

      this.notifications.emitPlanStatusChanged({ planId, status: 'BLOCKED' });
      await this.appendPlanOutputSafe(
        planId,
        `Plan run failed and will not be retried; plan set BLOCKED. Fix the cause and re-enqueue.\n${detail ?? 'unknown error'}`,
      );

      this.logger.info(
        `Plan status set BLOCKED after the job's final failed attempt (jobId=${jobId}${detail ? `, detail=${detail}` : ''}), planId=${planId}`,
        PlansProcessor.name,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to block plan after its job's final failure: planId=${planId}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /** Appends one chunk to the plan's output stream. Never throws (logs). */
  private async appendPlanOutputSafe(
    planId: string,
    content: string,
  ): Promise<void> {
    try {
      const repo = this.planOutputStreamService.getRepository();

      await repo.save(repo.create({ content, iteration: null, planId }));
    } catch (error) {
      this.logger.warn(
        `Failed to append to plan output: planId=${planId}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /** Reads this job's plan_runs row; null when there is none or the read fails (logged). */
  private async findRunForJobSafe(jobId: string): Promise<PlanRun | null> {
    try {
      return await this.planRunsService.findByQueueNameAndBullmqJobId(
        PLANS_QUEUE_NAME,
        jobId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to read plan_runs row for failed job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );

      return null;
    }
  }

  /** Settles a SCHEDULED run FAILED under the SCHEDULED guard. Never throws. */
  private async settleScheduledRunFailedSafe(planRunId: string): Promise<void> {
    try {
      await this.planRunsService.transitionScheduledRun(
        planRunId,
        PLAN_RUN_STATUS.FAILED,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to settle scheduled plan run ${planRunId} FAILED: ${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /** Settles this job's run FAILED only while it is still QUEUED / IN_PROGRESS. Never throws. */
  private async settleUnsettledRunFailedSafe(jobId: string): Promise<void> {
    try {
      await this.planRunsService.settleUnsettledRunByJob(
        PLANS_QUEUE_NAME,
        jobId,
        PLAN_RUN_STATUS.FAILED,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to settle plan_runs status: jobId=${jobId}, status=FAILED, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /**
   * Whether a job's failed attempt is its last — `attempts` guards against undefined by
   * defaulting to 1 (BullMQ's own default, meaning no retries), so an unconfigured job is
   * treated as exhausted on its first and only attempt. An `UnrecoverableError` (e.g. a
   * deterministic worktree-provisioning failure) is always the last attempt: BullMQ fails the job
   * outright without consulting `attempts`.
   */
  private hasExhaustedRetries(
    job: RunPlanJob,
    error: Error | undefined,
  ): boolean {
    if (error instanceof UnrecoverableError) return true;

    const attempts = job.opts.attempts ?? 1;

    return job.attemptsMade >= attempts;
  }

  /**
   * When a plan job is marked stalled (e.g. worker died or lock expired),
   * reset the plan status to QUEUED so it is not stuck as IN_PROGRESS. BullMQ
   * will move the job back to waiting for retry.
   */
  @OnWorkerEvent('stalled')
  async onPlanJobStalled(jobId: string): Promise<void> {
    const job = await this.plansQueue.getJob(jobId);
    const planId = job?.data?.planId;

    if (typeof planId !== 'string') return;

    await this.resetPlanStatusToQueued(planId, 'stalled', jobId);
  }

  /**
   * Builds a child-job lifecycle dispatcher when orchestrator path + feature
   * flag are enabled.
   */
  private createLifecycleDispatcherForJob(
    job: RunPlanJob,
    abortSignal?: AbortSignal,
  ): ReturnType<WorkflowLifecycleDispatcherFactory['create']> | undefined {
    if (!isRunPlanOrchestratorJobData(job.data)) {
      return undefined;
    }

    const configCwd = getWorkflowConfigCwd(
      job.data.workingDirectory,
      process.env,
    );

    if (
      !isLifecycleHooksChildJobsEnabled({
        lifecycleHooksChildJobs: loadWorkflowRalphConfig(configCwd, process.env)
          .lifecycleHooksChildJobs,
      })
    ) {
      return undefined;
    }

    return this.lifecycleDispatcherFactory.create({
      hooks: job.data.jobRunHooks,
      parentJobId: String(job.id),
      parentQueueName: PLANS_QUEUE_NAME,
      planRunJobData: job.data,
      signal: abortSignal,
    });
  }

  /**
   * Runs `afterAll` hooks for the terminal main-run outcome, then emits
   * queue job completed.
   */
  private async completePlanRunWithHooks(params: {
    readonly abortSignal?: AbortSignal;
    readonly job: RunPlanJob;
    readonly lifecycleDispatcher?: ReturnType<
      WorkflowLifecycleDispatcherFactory['create']
    >;
    readonly mainRunStarted: boolean;
    readonly mainRunSucceeded: boolean;
    readonly notification: PlanQueueJobCompletedPayload;
  }): Promise<void> {
    const dispatcher =
      params.lifecycleDispatcher ??
      this.createLifecycleDispatcherForJob(params.job, params.abortSignal);

    if (dispatcher !== undefined) {
      await runAfterAllHooksWithDispatcherThenNotify({
        dispatcher,
        jobData: params.job.data,
        logLabel: PlansProcessor.name,
        logger: this.logger,
        mainRunStarted: params.mainRunStarted,
        mainRunSucceeded: params.mainRunSucceeded,
        notification: params.notification,
        notifications: this.notifications,
      });
      return;
    }

    await runAfterRunHooksThenNotify({
      hooks: params.job.data.jobRunHooks,
      jobData: params.job.data,
      logLabel: PlansProcessor.name,
      logger: this.logger,
      mainRunStarted: params.mainRunStarted,
      mainRunSucceeded: params.mainRunSucceeded,
      notification: params.notification,
      notifications: this.notifications,
      planOutputStreamService: this.planOutputStreamService,
      plansService: this.plansService,
      signal: params.abortSignal,
      tasksService: this.tasksService,
    });
  }

  /**
   * Backstop after a finished run (not failed, cancelled or usage-limited): the orchestrator should
   * already have settled the plan COMPLETED or BLOCKED, but if it is still IN_PROGRESS or QUEUED it
   * is written COMPLETED when no task remains and BLOCKED otherwise — the run has ended and nothing
   * will pick the plan up again without a human. A QUEUED plan with another job waiting for it (a
   * re-enqueue that landed during this run) is left alone. Returns the plan's resulting status and
   * task counts for the notification. Does not throw; logs on failure.
   */
  private async settlePlanLeftOpenByRun(
    planId: string,
    jobId: string,
  ): Promise<{ counts: PlanTaskCounts; planStatus: string | null }> {
    const emptyCounts: PlanTaskCounts = {
      blocked: 0,
      remaining: 0,
      workable: 0,
    };

    try {
      const [planStatus, countsByPlan] = await Promise.all([
        this.getPlanStatus(planId),
        this.loadPlanTaskCounts([planId]),
      ]);
      const counts = countsByPlan.get(planId) ?? emptyCounts;

      if (planStatus !== 'IN_PROGRESS' && planStatus !== 'QUEUED') {
        return { counts, planStatus };
      }

      if (planStatus === 'QUEUED') {
        const waiting = await this.findPlanIdsWithQueuedJob(jobId);

        if (waiting.has(planId)) {
          return { counts, planStatus };
        }
      }

      const target = counts.remaining === 0 ? 'COMPLETED' : 'BLOCKED';
      const actorSub = await this.statusChangeSystemAccount.resolveId();
      const written = await this.planStatusService.writeGuardedStatus(planId, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: planStatus,
        requestedStatus: target,
        throwOnForbiddenInProgress: false,
      });

      if (!written) {
        return { counts, planStatus };
      }

      this.logger.info(
        `Plan run finished with plan still ${planStatus}; settled it ${target} (${counts.workable} pending, ${counts.blocked} blocked), planId=${planId}`,
        PlansProcessor.name,
      );
      this.notifications.emitPlanStatusChanged({ planId, status: target });

      return { counts, planStatus: target };
    } catch (error) {
      this.logger.warn(
        `Failed to settle a plan left open by a finished run: planId=${planId}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );

      return { counts: emptyCounts, planStatus: null };
    }
  }

  /**
   * Task counts ({@link countPlanTasks}) for each given plan, in one query. A plan with no tasks is
   * absent from the map.
   */
  private async loadPlanTaskCounts(
    planIds: readonly string[],
  ): Promise<Map<string, PlanTaskCounts>> {
    if (planIds.length === 0) {
      return new Map();
    }

    const tasks = await this.tasksService.getRepository().find({
      select: ['hookRole', 'hookSource', 'parentTaskId', 'planId', 'status'],
      where: { planId: In([...planIds]) },
    });
    const tasksByPlan = new Map<string, PlanTaskOutcomeFields[]>();

    for (const task of tasks) {
      const planTasks = tasksByPlan.get(task.planId) ?? [];

      planTasks.push(task);
      tasksByPlan.set(task.planId, planTasks);
    }

    return new Map(
      [...tasksByPlan].map(([planId, planTasks]) => [
        planId,
        countPlanTasks(planTasks),
      ]),
    );
  }

  /**
   * Plan ids with a BullMQ job that is running or going to run: active, waiting, prioritized or
   * delayed (a usage-limit continuation or a scheduled run). `exceptJobId` excludes the caller's
   * own job.
   */
  private async findPlanIdsWithQueuedJob(
    exceptJobId: string | undefined,
  ): Promise<Set<string>> {
    const jobs = await this.plansQueue.getJobs(
      ['active', 'delayed', 'prioritized', 'waiting'],
      0,
      500,
    );

    return new Set(
      jobs
        .filter((job) => String(job.id) !== exceptJobId)
        .map((job) => job.data?.planId)
        .filter((id): id is string => typeof id === 'string'),
    );
  }

  /**
   * Returns the current plan status (e.g. IN_PROGRESS, COMPLETED) or null if
   * not found. Does not throw.
   */
  private async getPlanStatus(planId: string): Promise<string | null> {
    try {
      const repo = this.plansService.getRepository();
      const plan = await repo.findOne({ where: { id: planId } });

      return plan?.status ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Updates plan status to QUEUED and emits notification. Does not throw;
   * logs on failure.
   */
  private async resetPlanStatusToQueued(
    planId: string,
    reason: string,
    detail?: string,
  ): Promise<void> {
    try {
      // Routed through the applyStatusChange chokepoint, attributed to the status-change-system
      // service account with a non-fatal capture failure — this method's own contract ("does not
      // throw; logs on failure") must hold regardless of ledger health, so a capture failure must
      // not roll back the row write the way a fatal one would. No guardCurrentStatus: the original
      // write was unconditional (any status → QUEUED on job failure/stall), so this preserves that.
      const actorSub = await this.statusChangeSystemAccount.resolveId();

      await this.planStatusService.writeGuardedStatus(planId, {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        captureFailureIsFatal: false,
        guardCurrentStatus: undefined,
        requestedStatus: 'QUEUED',
        throwOnForbiddenInProgress: false,
      });

      this.notifications.emitPlanStatusChanged({ planId, status: 'QUEUED' });

      this.logger.info(
        `Plan status reset to QUEUED (reason=${reason}${detail ? `, detail=${detail}` : ''}), planId=${planId}`,
        PlansProcessor.name,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to reset plan status to QUEUED: planId=${planId}, reason=${reason}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Plans queue worker shutting down (signal=${signal ?? 'unknown'})`,
      PlansProcessor.name,
    );

    try {
      await this.bullMqRunOutputWriter?.closeAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `BullMQ run output: KeyedJsonlWriter.closeAll failed during shutdown: ${message}`,
        PlansProcessor.name,
      );
    }

    await this.worker.close();
  }

  async process(job: RunPlanJob): Promise<PlanRunJobResult> {
    const { planId } = job.data;
    const jobId = String(job.id);
    const queueName = PLANS_QUEUE_NAME;

    // Admission comes before ANY side effect — the abort-controller attach, the run-location stamp,
    // the heartbeat, the work-ledger session, the plan status write, the worktree. A scheduled run
    // the fire-time policy settles (MISSED / SUPERSEDED / nothing to run), a run a cancel already
    // settled, or one whose claim lost a race returns here having touched nothing else.
    if (
      !(await this.admitRun(
        planId,
        queueName,
        jobId,
        job.data.workingDirectory,
      ))
    ) {
      const snapshot = this.processMetrics.getCurrentSnapshot();

      return { taskRunMetrics: { atEnd: snapshot, atStart: snapshot } };
    }

    const abortSignal = this.planRunCancellation.attach(planId);
    // Work-ledger run session (best-effort; opened after the plan resolves, closed in finally).
    let workSessionId: string | null = null;

    // Liveness heartbeat: bump last_heartbeat_at on a wall-clock timer, independent of
    // orchestrator iteration progress (a single iteration can exceed the staleness cutoff,
    // so an iteration-boundary bump would false-trip it on a live run). If this worker
    // crashes hard (SIGKILL/OOM/power-loss) without reaching the finally, the heartbeat
    // stops advancing and the staleness sweeper settles the stranded row. markRunStarted
    // (the claim in admitRun) already stamped the initial heartbeat, so the first tick can lag.
    const heartbeatTimer = this.startRunHeartbeat(queueName, jobId);

    try {
      const logContext = `${PlansProcessor.name} [planId=${planId}, jobId=${jobId}]`;

      const metricsAtStart = this.processMetrics.getCurrentSnapshot();

      this.logger.info(
        `Plan job started: planId=${planId}, jobId=${jobId}`,
        PlansProcessor.name,
      );

      const repo = this.plansService.getRepository();
      const plan = await repo.findOne({ where: { id: planId } });
      const _planTitle = plan?.title ?? undefined;

      workSessionId = await this.workLedgerRun.openRalphSession({
        bullmqJobId: jobId,
        planId,
        queueName,
      });

      // Routed through the applyStatusChange chokepoint (system-account actor, non-fatal capture —
      // a missing service account or ledger hiccup must not block the run from starting) so this
      // write, like every other plans.status transition, now emits a status_change artifact.
      const jobStartActorSub = await this.statusChangeSystemAccount.resolveId();

      await this.planStatusService.promoteParentPlanToInProgress(
        planId,
        {
          actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
          actorSub: jobStartActorSub ?? undefined,
        },
        false,
      );

      this.notifications.emitPlanUpdated({
        message: `Plan run started: ${planId}`,
        planId,
        severity: 'info',
      });

      this.notifications.emitPlanStatusChanged({
        planId,
        status: 'IN_PROGRESS',
      });

      const lifecycleDispatcher = this.createLifecycleDispatcherForJob(
        job,
        abortSignal,
      );

      const beforeRunHookInput = {
        hooks: job.data.jobRunHooks,
        jobData: job.data,
        logLabel: PlansProcessor.name,
        logger: this.logger,
        notifications: this.notifications,
        planOutputStreamService: this.planOutputStreamService,
        planStatusService: this.planStatusService,
        plansService: this.plansService,
        signal: abortSignal,
        statusChangeSystemAccount: this.statusChangeSystemAccount,
        tasksService: this.tasksService,
      };
      const runBeforeRunHooks = async () => {
        if (lifecycleDispatcher !== undefined) {
          return runBeforeAllHooksWithDispatcher({
            dispatcher: lifecycleDispatcher,
            ...beforeRunHookInput,
          });
        }
        return runBeforeRunHooksAndHandleBlock(beforeRunHookInput);
      };
      const blockedByBeforeRunHook = await runBeforeRunHooks();

      if (blockedByBeforeRunHook) {
        const metricsAtEnd = this.processMetrics.getCurrentSnapshot();

        return {
          taskRunMetrics: { atEnd: metricsAtEnd, atStart: metricsAtStart },
        };
      }

      const result = await this.processOrchestrator(
        job,
        jobId,
        logContext,
        metricsAtStart,
        abortSignal,
        heartbeatTimer,
        lifecycleDispatcher,
        workSessionId,
      );

      if (result.taskRunMetrics) {
        const enhancedMetrics = this.buildEnhancedMetrics(result);
        await this.appendTaskRunMetricsToPlanOutput(planId, enhancedMetrics);
        this.logTaskRunMetrics(planId, jobId, enhancedMetrics);
      }

      return result;
    } finally {
      clearInterval(heartbeatTimer);
      await closeRunOutputForJob({
        jobId,
        logLabel: PlansProcessor.name,
        logger: this.logger,
        queueName,
        writer: this.bullMqRunOutputWriter,
      });
      this.bullMqRunOutputRetention.maybePruneAfterJobClose();
      this.planRunCancellation.detach(planId);
      await this.clearRunLocationSafe(queueName, jobId);
      await this.workLedgerRun.closeRalphSession(
        workSessionId,
        `workflow-ralph run ${jobId}`,
      );
    }
  }

  /**
   * Starts a wall-clock heartbeat timer that bumps last_heartbeat_at on this job's
   * plan_runs row every HEARTBEAT_INTERVAL_MS. Best-effort: a failed bump is logged and
   * never thrown into the job. Returns the interval handle; the caller clears it in the
   * job's finally. Wall-clock (not iteration-boundary) so a long single iteration cannot
   * let a live run exceed the staleness cutoff and be falsely swept.
   */
  private startRunHeartbeat(
    queueName: string,
    bullmqJobId: string,
  ): ReturnType<typeof setInterval> {
    const timer = setInterval(() => {
      void this.planRunsService
        .recordHeartbeatByJob(queueName, bullmqJobId)
        .catch((error: unknown) => {
          this.logger.warn(
            `Failed to bump plan_runs heartbeat: jobId=${bullmqJobId}, error=${error instanceof Error ? error.message : String(error)}`,
            PlansProcessor.name,
          );
        });
    }, HEARTBEAT_INTERVAL_MS);
    timer.unref?.();

    return timer;
  }

  /**
   * Decides whether this job may run, and claims its plan_runs row when it may. Reads the row first
   * and applies, in order:
   *
   * - no row (a legacy or duplicated job nothing recorded) → runs, as it always did;
   * - SCHEDULED → the fire-time policy ({@link ScheduledPlanRunService.fire}): only `fire` continues,
   *   with the row now claimed QUEUED and the plan and its tasks flipped QUEUED;
   * - any status a worker cannot start from (CANCELLED, MISSED, SUPERSEDED, STALE, COMPLETED, ...) →
   *   does not run; a settled row is never reopened;
   * - QUEUED / IN_PROGRESS → runs.
   *
   * Then the claim: {@link stampRunLocation} → `markRunStarted`, the conditional QUEUED|IN_PROGRESS →
   * IN_PROGRESS update. When a row exists and that update matches nothing, something settled the run
   * between the read and the claim, and the job backs off. A failed stamp (DB hiccup) stays
   * best-effort and the run goes ahead, as before.
   */
  private async admitRun(
    planId: string,
    queueName: string,
    jobId: string,
    workingDirectory: string | undefined,
  ): Promise<boolean> {
    const run = await this.planRunsService.findByQueueNameAndBullmqJobId(
      queueName,
      jobId,
    );

    if (run?.status === PLAN_RUN_STATUS.SCHEDULED) {
      const outcome = await this.scheduledPlanRun.fire({
        run,
        workingDirectory,
      });

      if (outcome.kind !== 'fire') {
        return false;
      }
    } else if (run !== null && !isStartableRunStatus(run.status)) {
      this.logger.warn(
        `Plan job ${jobId} for plan ${planId} not started: its plan_runs row ${run.id} is already ${run.status}.`,
        PlansProcessor.name,
      );

      return false;
    }

    const claimed = await this.stampRunLocation(queueName, jobId);

    if (run !== null && claimed === 0) {
      this.logger.warn(
        `Plan job ${jobId} for plan ${planId} not started: its plan_runs row ${run.id} was settled before the worker could claim it.`,
        PlansProcessor.name,
      );

      return false;
    }

    return true;
  }

  /**
   * Stamps hostname/pid/worker_id and IN_PROGRESS on the plan_runs row for this job (the guarded
   * `markRunStarted` claim) so cross-process cancel can observe where the run executes. Returns the
   * number of rows claimed, or null when the write failed — logged, never thrown: a DB hiccup here
   * must not stop a run that admission already let through.
   */
  private async stampRunLocation(
    queueName: string,
    bullmqJobId: string,
  ): Promise<number | null> {
    try {
      return await this.planRunsService.markRunStarted({
        bullmqJobId,
        hostname: os.hostname(),
        pid: process.pid,
        queueName,
        workerId: this.worker?.id ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to stamp plan_runs location: jobId=${bullmqJobId}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );

      return null;
    }
  }

  /**
   * Best-effort: clear hostname/pid/worker_id on the plan_runs row when the job
   * finishes (the cancel marker is intentionally left intact). Never throws.
   */
  private async clearRunLocationSafe(
    queueName: string,
    bullmqJobId: string,
  ): Promise<void> {
    try {
      await this.planRunsService.clearRunLocation(queueName, bullmqJobId);
    } catch (error) {
      this.logger.warn(
        `Failed to clear plan_runs location: jobId=${bullmqJobId}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /**
   * Best-effort: settle the plan_runs row for this job to a terminal status
   * (COMPLETED / CANCELLED / FAILED — never STALE, which is reserved for the stale
   * sweeper) and null its run-location columns. When the orchestrator returned
   * settle artifacts (`headSha` / `prNumber`) and the status is COMPLETED, also
   * records work-ledger git_commit + pull_request artifacts (same mechanism as
   * `settleCliPlanRun`). Never throws — the settle write is diagnostic bookkeeping,
   * not on the critical path of the job outcome itself.
   */
  private async settleQueuedRunStatus(
    queueName: string,
    bullmqJobId: string,
    status: PlanRunStatus,
    settleArtifacts?: {
      readonly headSha: string | undefined;
      readonly prNumber: number | undefined;
    },
  ): Promise<void> {
    try {
      const run = await this.planRunsService.settleRunByJob(
        queueName,
        bullmqJobId,
        status,
      );

      if (
        run != null &&
        status === PLAN_RUN_STATUS.COMPLETED &&
        settleArtifacts != null &&
        (settleArtifacts.headSha != null || settleArtifacts.prNumber != null)
      ) {
        await this.settleRunLedger.recordSettledRunArtifacts({
          headSha: settleArtifacts.headSha ?? null,
          planRun: run,
          prNumber: settleArtifacts.prNumber ?? null,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to settle plan_runs status: jobId=${bullmqJobId}, status=${status}, error=${error instanceof Error ? error.message : String(error)}`,
        PlansProcessor.name,
      );
    }
  }

  /**
   * Builds an EnhancedTaskRunMetrics object from PlanRunJobResult.
   * Combines taskRunMetrics with optional childProcessMetrics and wallClockMetrics.
   */
  private buildEnhancedMetrics(
    result: PlanRunJobResult,
  ): EnhancedTaskRunMetrics {
    const base = result.taskRunMetrics ?? {
      atEnd: this.processMetrics.getCurrentSnapshot(),
      atStart: this.processMetrics.getCurrentSnapshot(),
    };

    const pickChildProcessMetrics = () => {
      if ('childProcessMetrics' in result) return result.childProcessMetrics;
      return undefined;
    };
    const pickWallClockMetrics = () => {
      if ('wallClockMetrics' in result) return result.wallClockMetrics;
      return undefined;
    };

    const enhanced: EnhancedTaskRunMetrics = {
      ...base,
      childProcessMetrics: pickChildProcessMetrics(),
      wallClockMetrics: pickWallClockMetrics(),
    };

    return enhanced;
  }

  /**
   * Appends a one-line task-run metrics summary to the plan's output stream
   * so it appears in get_plan_output and activity. Does not throw; logs on failure.
   * Uses formatEnhancedTaskRunMetricsSummary to include child process peak CPU%,
   * wall-clock ratio, and system load when available.
   */
  private async appendTaskRunMetricsToPlanOutput(
    planId: string,
    taskRunMetrics: EnhancedTaskRunMetrics,
  ): Promise<void> {
    try {
      const content = formatEnhancedTaskRunMetricsSummary(taskRunMetrics);
      const repo = this.planOutputStreamService.getRepository();
      const entity = repo.create({
        content,
        iteration: null,
        planId,
      });

      await repo.save(entity);
    } catch (error) {
      const isError = error instanceof Error;

      this.logger.warn(`Failed to append task-run metrics to plan output`, {
        message: isError ? error.message : String(error),
        name: PlansProcessor.name,
        planId,
      });
    }
  }

  /**
   * Logs one structured JSON line for external collection (e.g. log aggregators).
   * Includes planId and enhanced taskRunMetrics with child process and wall-clock metrics.
   */
  private logTaskRunMetrics(
    planId: string,
    jobId: string,
    taskRunMetrics: EnhancedTaskRunMetrics,
  ): void {
    this.logger.info(
      JSON.stringify({
        event: WORKFLOW_EVENT.METRIC,
        jobId,
        planId,
        taskRunMetrics,
      }),
      PlansProcessor.name,
    );
  }

  /**
   * Structured JSON log for in-process Ralph orchestrator lifecycle. Uses
   * {@link WORKFLOW_EVENT}; which pair via shared `correlationId` / `jobId`.
   * Plan id is included here at the application layer only.
   */
  private logAgenticOrchestratorRunStructured(params: {
    readonly correlationId: string;
    readonly outcome?: {
      readonly reason: string;
      readonly status: 'failed' | 'finished';
    };
    readonly phase: 'end' | 'start';
    readonly planId: string;
    readonly queueJobId: string;
    readonly queueName: string;
    readonly workflowKind: 'ralph';
  }): void {
    this.logger.info(
      JSON.stringify({
        correlationId: params.correlationId,
        event: WORKFLOW_EVENT.JOB_RUN,
        outcome: params.outcome,
        phase: params.phase,
        planId: params.planId,
        queueJobId: params.queueJobId,
        queueName: params.queueName,
        workflowKind: params.workflowKind,
      }),
      PlansProcessor.name,
    );
  }

  /**
   * In-process GraphQL Ralph via {@link AgenticRalphOrchestratorService} and
   * `@openthrottle/openthrottle-agentic-ralph`. Does not use worktrees or `workflow-ralph` spawn;
   * iteration uses `runIterationAsync` (Cursor or Claude per job `executionBackend`) in the server process.
   */
  private async processOrchestrator(
    job: RunPlanJob,
    jobId: string,
    logContext: string,
    metricsAtStart: ProcessMetricsSnapshot,
    abortSignal: AbortSignal,
    heartbeatTimer: ReturnType<typeof setInterval>,
    lifecycleDispatcher?: ReturnType<
      WorkflowLifecycleDispatcherFactory['create']
    >,
    workSessionId?: string | null,
  ): Promise<PlanRunJobResult> {
    if (!isRunPlanOrchestratorJobData(job.data)) {
      throw new Error('Expected orchestrator job data');
    }

    const data = job.data;

    const correlation = {
      correlationId: jobId,
      queueJobId: jobId,
      queueName: PLANS_QUEUE_NAME,
    } as const;

    this.logAgenticOrchestratorRunStructured({
      correlationId: correlation.correlationId,
      phase: 'start',
      planId: data.planId,
      queueJobId: correlation.queueJobId,
      queueName: correlation.queueName,
      workflowKind: 'ralph',
    });

    // Filled by the orchestrator once it has provisioned the run's worktree, so teardown acts on
    // the path the run actually used. Stays null for a run that opted out of a worktree.
    const provisioned: { worktree: ProvisionedPlanRunWorktree | null } = {
      worktree: null,
    };

    const outcome = await this.agenticRalphOrchestrator.runPlanOrchestratorJob({
      correlation,
      jobData: data,
      lifecycleDispatcher,
      onWorktreeProvisioned: (worktree) => {
        provisioned.worktree = worktree;
      },
      signal: abortSignal,
      workSessionId,
    });

    this.logAgenticOrchestratorRunStructured({
      correlationId: correlation.correlationId,
      outcome: {
        reason: outcome.reason,
        status: outcome.status,
      },
      phase: 'end',
      planId: data.planId,
      queueJobId: correlation.queueJobId,
      queueName: correlation.queueName,
      workflowKind: 'ralph',
    });

    // Stop the wall-clock heartbeat BEFORE any terminal plan_runs write below: a tick
    // landing after the row is settled would advance last_heartbeat_at on a terminal
    // (COMPLETED/CANCELLED/FAILED) row, which reads as a live run to the staleness
    // reader/sweeper and to any human looking at the column.
    clearInterval(heartbeatTimer);

    const metricsAtEnd = this.processMetrics.getCurrentSnapshot();
    const taskRunMetrics = { atEnd: metricsAtEnd, atStart: metricsAtStart };

    if (outcome.status === 'failed') {
      this.logger.warn(
        `Orchestrator Ralph failed: reason=${outcome.reason}, ${logContext}`,
        PlansProcessor.name,
      );

      await this.settleQueuedRunStatus(
        PLANS_QUEUE_NAME,
        jobId,
        PLAN_RUN_STATUS.FAILED,
      );

      await this.completePlanRunWithHooks({
        abortSignal,
        job,
        mainRunStarted: true,
        mainRunSucceeded: false,
        notification: {
          jobType: 'plans',
          message: `Plan run failed: ${data.planId} — ${outcome.reason}`,
          planId: data.planId,
          severity: 'error',
        },
      });

      await this.planRunWorktreeCleanup.afterRun({
        planId: data.planId,
        prNumber: undefined,
        reason: outcome.reason,
        worktree: provisioned.worktree,
      });

      return { taskRunMetrics };
    }

    if (outcome.reason === 'workflow_cancelled') {
      this.logger.info(
        `Orchestrator Ralph cancelled (user or API), ${logContext}`,
        PlansProcessor.name,
      );

      await this.settleQueuedRunStatus(
        PLANS_QUEUE_NAME,
        jobId,
        PLAN_RUN_STATUS.CANCELLED,
      );

      await this.completePlanRunWithHooks({
        abortSignal,
        job,
        mainRunStarted: true,
        mainRunSucceeded: false,
        notification: {
          jobType: 'plans',
          message: `Plan run cancelled: ${data.planId}`,
          planId: data.planId,
          severity: 'info',
        },
      });

      await this.planRunWorktreeCleanup.afterRun({
        planId: data.planId,
        prNumber: undefined,
        reason: outcome.reason,
        worktree: provisioned.worktree,
      });

      return { taskRunMetrics };
    }

    if (outcome.reason === 'workflow_usage_limited') {
      this.logger.info(
        `Orchestrator Ralph stopped on a usage limit (${outcome.usageLimit.rateLimitType ?? 'unknown window'}, resets ${outcome.usageLimit.resetsAt ?? 'unknown'}), ${logContext}`,
        PlansProcessor.name,
      );

      // Settles the row USAGE_LIMITED and either enqueues the delayed continuation or parks the
      // plan. Never throws, so BullMQ sees a normally-completed job and does not retry it.
      // afterAll hooks are deliberately skipped: the plan is paused, not finished.
      const handling = await this.usageLimitResume.handle({
        jobData: data,
        jobId,
        limit: outcome.usageLimit,
        planId: data.planId,
      });

      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: handling.message,
        planId: data.planId,
        severity: 'warning',
      });

      return { taskRunMetrics };
    }

    // A finished run leaves no job behind, so a plan it left IN_PROGRESS/QUEUED would sit in the
    // queue looking runnable forever (and the startup reconcile used to re-queue it).
    const settled = await this.settlePlanLeftOpenByRun(data.planId, jobId);
    const { message, severity } = buildFinishedRunNotification({
      counts: settled.counts,
      planId: data.planId,
      planStatus: settled.planStatus,
      prNumber: outcome.prNumber,
      reason: outcome.reason,
    });

    this.logger.info(
      `Orchestrator Ralph finished: reason=${outcome.reason}, jobId=${jobId}, ${logContext}`,
      PlansProcessor.name,
    );

    await this.settleQueuedRunStatus(
      PLANS_QUEUE_NAME,
      jobId,
      PLAN_RUN_STATUS.COMPLETED,
      {
        headSha: outcome.headSha,
        prNumber: outcome.prNumber,
      },
    );

    await this.completePlanRunWithHooks({
      abortSignal,
      job,
      mainRunStarted: true,
      mainRunSucceeded: true,
      notification: {
        jobType: 'plans',
        message,
        planId: data.planId,
        severity,
      },
    });

    // After settle AND afterAll hooks: hooks may still need the worktree. Never throws, and never
    // touches the settled status — a kept worktree is reported in plan output, nothing more.
    await this.planRunWorktreeCleanup.afterRun({
      planId: data.planId,
      prNumber: outcome.prNumber,
      reason: outcome.reason,
      worktree: provisioned.worktree,
    });

    return { taskRunMetrics };
  }
}
