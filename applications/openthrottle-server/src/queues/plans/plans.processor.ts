import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import {
  Inject,
  Optional,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { getWorkflowConfigCwd } from '@openthrottle/openthrottle-agentic-utils';
import { loadWorkflowRalphConfig } from '@tools/workflows';
import {
  HEARTBEAT_INTERVAL_MS,
  PlanOutputStreamService,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import * as os from 'node:os';
import {
  runAfterAllHooksWithDispatcherThenNotify,
  runAfterRunHooksThenNotify,
  runBeforeAllHooksWithDispatcher,
  runBeforeRunHooksAndHandleBlock,
} from '../job-run-hooks/execute-plan-job-run-hooks';
// import { DelayedError } from 'bullmq';
import { WorkflowLifecycleDispatcherFactory } from '../plan-lifecycle-hooks/workflow-lifecycle-dispatcher.service';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import type { PlanQueueJobCompletedPayload } from '../job-run-hooks/execute-plan-job-run-hooks';
import type { Queue } from 'bullmq';
import {
  isLifecycleHooksChildJobsEnabled,
  WORKFLOW_EVENT,
} from '@openthrottle/openthrottle-agentic-workflow';
import { formatEnhancedTaskRunMetricsSummary } from '../../metrics/process-metrics-format';
import type {
  EnhancedTaskRunMetrics,
  ProcessMetricsSnapshot,
} from '../../metrics/process-metrics.types';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AgenticRalphOrchestratorService } from '../agentic-ralph/agentic-ralph-orchestrator.service';
import { closeRunOutputForJob } from '../bullmq-keyed-run-logging';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import { BULLMQ_RUN_OUTPUT_WRITER } from '../bullmq-run-output-writer.token';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
  // WORKTREE_RETRY_DELAY_MS,
} from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import { WorkLedgerRunService } from './work-ledger-run.service';
import { isRunPlanOrchestratorJobData } from './plans.types';
import type {
  PlanRunJobResult,
  RunPlanJob,
  RunPlanJobData,
} from './plans.types';

const CONCURRENCY = 1;

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
 * Max iterations: when Ralph hits the iteration limit (e.g. 10) with work remaining, it exits with
 * code 0 and workflow-ralph resets the current task to PENDING so a future run can resume. We do
 * not re-queue the plan job here (costly); the user can re-run the plan or re-enqueue. When the
 * run succeeds (exit 0) but the plan is still IN_PROGRESS, we emit a warning notification so the
 * UI can show "Plan hit iteration limit; tasks still pending. Re-run to continue."
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
    private readonly planRunsService: PlanRunsService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, PlanRunJobResult | void>,
    private readonly plansService: PlansService,
    private readonly processMetrics: ProcessMetricsService,
    private readonly tasksService: TasksService,
    private readonly workLedgerRun: WorkLedgerRunService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.logger.info(
      `Plans worker stalled-job recovery: lockDuration=${PLANS_WORKER_LOCK_DURATION_MS}ms, stalledInterval=${PLANS_WORKER_STALLED_INTERVAL_MS}ms, maxStalledCount=${PLANS_WORKER_MAX_STALLED_COUNT}. Jobs interrupted by restart re-enter the queue within ~${(PLANS_WORKER_LOCK_DURATION_MS + PLANS_WORKER_STALLED_INTERVAL_MS) / 1000}s.`,
      PlansProcessor.name,
    );

    await this.reconcilePlanStatusOnStartup();
    await this.reconcilePlansQueuedWithInProgressTasks();
  }

  /**
   * On startup, reset any plan that is IN_PROGRESS but has no active job in the queue (e.g. after server restart). Prevents plans from staying stuck as IN_PROGRESS when the job was interrupted.
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

    for (const plan of plans) {
      if (planIdsWithActiveJob.has(plan.id)) {
        continue;
      }

      this.logger.info(
        `Plan status reconciliation: resetting plan ${plan.id} from IN_PROGRESS to QUEUED (no active job).`,
        PlansProcessor.name,
      );

      // eslint-disable-next-line no-await-in-loop
      await repo.update({ id: plan.id }, { status: 'QUEUED' });

      this.notifications.emitPlanStatusChanged({
        planId: plan.id,
        status: 'QUEUED',
      });
    }
  }

  /**
   * On startup, promote QUEUED plans that still have IN_PROGRESS
   * tasks (e.g. after stall/requeue reset the plan but not tasks). Mirrors downward reconcile in {@link reconcilePlanStatusOnStartup}.
   */
  private async reconcilePlansQueuedWithInProgressTasks(): Promise<void> {
    const planRepo = this.plansService.getRepository();
    const taskRepo = this.tasksService.getRepository();
    const plans = await planRepo.find({ where: { status: 'QUEUED' } });

    if (plans.length === 0) {
      return;
    }

    for (const plan of plans) {
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
        await this.tasksService.syncParentPlanStatus(plan.id);

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
   * When a plan job fails, reset the plan status to QUEUED so it is not stuck as IN_PROGRESS. The job may be retried by BullMQ; if not, the user can re-enqueue.
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

    await this.resetPlanStatusToQueued(planId, 'failed', error?.message);
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
   * Returns message and severity for queue job completed: if plan is still
   * IN_PROGRESS (e.g. iteration limit), suggest re-run; otherwise success.
   */
  private async getJobCompletedMessageAndSeverity(
    planId: string,
    defaultMessage: string,
  ): Promise<{ message: string; severity: 'success' | 'warning' }> {
    const status = await this.getPlanStatus(planId);

    if (status === 'IN_PROGRESS') {
      this.logger.info(
        `Plan run finished but plan still IN_PROGRESS (e.g. iteration limit); planId=${planId}`,
        PlansProcessor.name,
      );

      return {
        message: `Plan ${planId} hit iteration limit; tasks still pending. Re-run to continue.`,
        severity: 'warning',
      };
    }

    return { message: defaultMessage, severity: 'success' };
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
      const repo = this.plansService.getRepository();
      await repo.update({ id: planId }, { status: 'QUEUED' });

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
    const abortSignal = this.planRunCancellation.attach(planId);
    const jobId = String(job.id);
    const queueName = PLANS_QUEUE_NAME;
    // Work-ledger run session (best-effort; opened after the plan resolves, closed in finally).
    let workSessionId: string | null = null;

    // Stamp run-location so a cancel request from another process/host can observe
    // where the run lives (Channel 0 is the in-memory attach above; this is the
    // durable, cross-process observability half). Cleared in finally alongside detach.
    await this.stampRunLocation(queueName, jobId);

    // Liveness heartbeat: bump last_heartbeat_at on a wall-clock timer, independent of
    // orchestrator iteration progress (a single iteration can exceed the staleness cutoff,
    // so an iteration-boundary bump would false-trip it on a live run). If this worker
    // crashes hard (SIGKILL/OOM/power-loss) without reaching the finally, the heartbeat
    // stops advancing and the staleness sweeper settles the stranded row. markRunStarted
    // (in stampRunLocation) already stamped the initial heartbeat, so the first tick can lag.
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

      // Direct operational write (fast, in-process, drives the notification below and the
      // startup status reconcile). This intentionally does NOT emit a status_change artifact:
      // it bypasses the updatePlan resolver, and the orchestrator's later
      // promotePlanToInProgressIfNeeded is then a no-op for capture (from === to). The plan's
      // worked-on state is instead represented by the run session's attached plan subject; the
      // plan's COMPLETED transition and all task transitions ARE captured (via the orchestrator's
      // resolver calls, attributed to this run session through X-OT-Session-Id).
      await repo.update({ id: planId }, { status: 'IN_PROGRESS' });

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

      const blockedByBeforeRunHook =
        lifecycleDispatcher !== undefined
          ? await runBeforeAllHooksWithDispatcher({
              dispatcher: lifecycleDispatcher,
              hooks: job.data.jobRunHooks,
              jobData: job.data,
              logLabel: PlansProcessor.name,
              logger: this.logger,
              notifications: this.notifications,
              planOutputStreamService: this.planOutputStreamService,
              plansService: this.plansService,
              signal: abortSignal,
              tasksService: this.tasksService,
            })
          : await runBeforeRunHooksAndHandleBlock({
              hooks: job.data.jobRunHooks,
              jobData: job.data,
              logLabel: PlansProcessor.name,
              logger: this.logger,
              notifications: this.notifications,
              planOutputStreamService: this.planOutputStreamService,
              plansService: this.plansService,
              signal: abortSignal,
              tasksService: this.tasksService,
            });

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
   * Best-effort: stamp hostname/pid/worker_id on the plan_runs row for this job
   * so cross-process cancel can observe where the run executes. Never throws —
   * location is diagnostic, not on the critical path.
   */
  private async stampRunLocation(
    queueName: string,
    bullmqJobId: string,
  ): Promise<void> {
    try {
      await this.planRunsService.markRunStarted({
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

    const enhanced: EnhancedTaskRunMetrics = {
      ...base,
      childProcessMetrics:
        'childProcessMetrics' in result
          ? result.childProcessMetrics
          : undefined,
      wallClockMetrics:
        'wallClockMetrics' in result ? result.wallClockMetrics : undefined,
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

    const outcome = await this.agenticRalphOrchestrator.runPlanOrchestratorJob({
      correlation,
      jobData: data,
      lifecycleDispatcher,
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

    const metricsAtEnd = this.processMetrics.getCurrentSnapshot();
    const taskRunMetrics = { atEnd: metricsAtEnd, atStart: metricsAtStart };

    if (outcome.status === 'failed') {
      this.logger.warn(
        `Orchestrator Ralph failed: reason=${outcome.reason}, ${logContext}`,
        PlansProcessor.name,
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

      return { taskRunMetrics };
    }

    if (outcome.reason === 'workflow_cancelled') {
      this.logger.info(
        `Orchestrator Ralph cancelled (user or API), ${logContext}`,
        PlansProcessor.name,
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

      return { taskRunMetrics };
    }

    const defaultMessage = `Plan run finished: ${data.planId} (${outcome.reason})`;

    let message: string;
    let severity: 'success' | 'warning';

    if (outcome.reason === 'workflow_plan_already_terminal') {
      message = `Plan run skipped: ${data.planId} (plan already terminal)`;
      severity = 'success';
    } else if (outcome.reason === 'workflow_max_iterations') {
      const resolved = await this.getJobCompletedMessageAndSeverity(
        data.planId,
        defaultMessage,
      );
      message = resolved.message;
      severity = resolved.severity;
    } else {
      message = defaultMessage;
      severity = 'success';
    }

    this.logger.info(
      `Orchestrator Ralph finished: reason=${outcome.reason}, jobId=${jobId}, ${logContext}`,
      PlansProcessor.name,
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

    return { taskRunMetrics };
  }
}
