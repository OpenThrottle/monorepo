import { spawn } from 'child_process';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Inject, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import {
  getWorktreeTargetsFromEnv,
  runWorktreeWorkflow,
  WORKTREE_TRACKER_TOKEN,
} from '@openthrottle/nestjs-worktrees';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { runChildJob } from '@tools/workflows';
import type { ChildJobResult } from '@tools/workflows';
import {
  PlanOutputStreamService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { DelayedError } from 'bullmq';
import type { Queue } from 'bullmq';
import { formatEnhancedTaskRunMetricsSummary } from '../../metrics/process-metrics-format';
import type {
  EnhancedTaskRunMetrics,
  ProcessMetricsSnapshot,
} from '../../metrics/process-metrics.types';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  PLANS_QUEUE_NAME,
  PLANS_WORKER_LOCK_DURATION_MS,
  PLANS_WORKER_MAX_STALLED_COUNT,
  PLANS_WORKER_STALLED_INTERVAL_MS,
  WORKTREE_RETRY_DELAY_MS,
} from './plans.constants';
import type {
  PlanRunJobResult,
  RunPlanJob,
  RunPlanJobData,
} from './plans.types';

/**
 * @description Derives worker concurrency from WORKTREE_TARGETS env at module load time.
 * When worktrees are configured, concurrency matches the number of worktrees so jobs
 * can run in parallel across different worktrees. Defaults to 1 when no worktrees configured.
 */
function getWorkerConcurrency(): number {
  const worktreeTargets = getWorktreeTargetsFromEnv();

  return worktreeTargets.length > 0 ? worktreeTargets.length : 1;
}

const CONCURRENCY = getWorkerConcurrency();

/** Same command as CopyRalphCommand "copy to clipboard" on the plan route. */
const RALPH_CMD = 'workflow-ralph';

/**
 * @description Resolves the monorepo root so we can run `pnpm exec workflow-ralph` from there.
 * Set WORKSPACE_ROOT when the API is not started from the repo root (e.g. in Docker).
 */
function getWorkspaceRoot(): string {
  return process.env.WORKSPACE_ROOT ?? process.cwd();
}

/**
 * @description Waits for the child process to exit and resolves with its exit code (or null if signaled).
 */
function spawnAndWait(
  command: string,
  args: string[],
  options: { cwd: string },
  onStdout: (chunk: string) => void,
  onStderr: (chunk: string) => void,
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => onStdout(data.toString()));
    child.stderr?.on('data', (data: Buffer) => onStderr(data.toString()));

    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve(signal != null ? null : (code ?? null));
    });
  });
}

/**
 * @description Processes plan-run jobs for the plans queue. Concurrency is derived from the number
 * of configured worktrees (WORKTREE_TARGETS env), defaulting to 1 when no worktrees are configured.
 * When WORKTREE_TARGETS is set, runs the worktree workflow (acquire target → Ralph in worktree →
 * ensure commit → release). Otherwise runs Ralph in the process cwd (legacy behavior).
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
   * @description Sets a hard limit on how often a worker picks up new jobs,
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
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly plansService: PlansService,
    private readonly processMetrics: ProcessMetricsService,
    @Inject(WORKTREE_TRACKER_TOKEN)
    private readonly worktreeTracker: IWorktreeTargetsTracker,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, PlanRunJobResult | void>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const worktreeTargetsCount = this.worktreeTracker.listTargets().length;
    const concurrencySource =
      worktreeTargetsCount > 0
        ? `worktree count (${worktreeTargetsCount})`
        : 'default (no worktrees)';

    this.logger.info(
      `Plans queue worker started (concurrency=${CONCURRENCY}, source=${concurrencySource})`,
      PlansProcessor.name,
    );

    this.logger.info(
      `Plans worker stalled-job recovery: lockDuration=${PLANS_WORKER_LOCK_DURATION_MS}ms, stalledInterval=${PLANS_WORKER_STALLED_INTERVAL_MS}ms, maxStalledCount=${PLANS_WORKER_MAX_STALLED_COUNT}. Jobs interrupted by restart re-enter the queue within ~${(PLANS_WORKER_LOCK_DURATION_MS + PLANS_WORKER_STALLED_INTERVAL_MS) / 1000}s.`,
      PlansProcessor.name,
    );

    if (worktreeTargetsCount > 0 && process.env.NODE_ENV === 'development') {
      this.logger.warn(
        [
          '*** WORKTREE MODE IN DEVELOPMENT ***',
          'Worktrees are configured (WORKTREE_TARGETS) but NODE_ENV=development.',
          'This setup is not resilient (e.g. server restart can leave jobs/worktrees in a bad state).',
          'Use worktree mode in production or after making it more resilient.',
        ].join(' '),
        PlansProcessor.name,
      );
    }

    await this.reconcilePlanStatusOnStartup();
  }

  /**
   * @description On startup, reset any plan that is IN_PROGRESS but has no active job in the queue (e.g. after server restart). Prevents plans from staying stuck as IN_PROGRESS when the job was interrupted.
   */
  private async reconcilePlanStatusOnStartup(): Promise<void> {
    const repo = this.plansService.getRepository();
    const inProgressPlans = await repo.find({
      where: { status: 'IN_PROGRESS' },
    });
    if (inProgressPlans.length === 0) {
      return;
    }

    const activeJobs = await this.plansQueue.getJobs(['active'], 0, 500);
    const planIdsWithActiveJob = new Set(
      activeJobs
        .map((job) => job.data?.planId as string | undefined)
        .filter((id): id is string => typeof id === 'string'),
    );

    for (const plan of inProgressPlans) {
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
   * @description When a plan job fails, reset the plan status to QUEUED so it is not stuck as IN_PROGRESS. The job may be retried by BullMQ; if not, the user can re-enqueue.
   * Handles both payload shapes: { job, error } (NestJS) or (job, error) as separate args from BullMQ Worker.
   */
  @OnWorkerEvent('failed')
  async onPlanJobFailed(
    payload: { job?: RunPlanJob; error?: Error } | RunPlanJob,
    errorArg?: Error,
  ): Promise<void> {
    const job =
      'job' in payload && payload.job ? payload.job : (payload as RunPlanJob);
    const error = ('error' in payload && payload.error) || errorArg;
    const planId = job?.data?.planId;

    if (typeof planId !== 'string') return;

    await this.resetPlanStatusToQueued(planId, 'failed', error?.message);
  }

  /**
   * @description When a plan job is marked stalled (e.g. worker died or lock expired), reset the plan status to QUEUED so it is not stuck as IN_PROGRESS. BullMQ will move the job back to waiting for retry.
   */
  @OnWorkerEvent('stalled')
  async onPlanJobStalled(jobId: string): Promise<void> {
    const job = await this.plansQueue.getJob(jobId);
    const planId = job?.data?.planId;

    if (typeof planId !== 'string') return;

    await this.resetPlanStatusToQueued(planId, 'stalled', jobId);
  }

  /**
   * @description Returns the current plan status (e.g. IN_PROGRESS, COMPLETED) or null if not found. Does not throw.
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
   * @description Returns message and severity for queue job completed: if plan is still IN_PROGRESS (e.g. iteration limit), suggest re-run; otherwise success.
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
   * @description Updates plan status to QUEUED and emits notification. Does not throw; logs on failure.
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

  /**
   * @description Handles the case when all worktrees are locked. Instead of failing immediately,
   * moves the job to delayed state with a 30-second delay so it can retry when a worktree becomes
   * available. Resets plan status to QUEUED and emits a "waiting for worktree" notification.
   * Throws DelayedError to signal BullMQ that the job was moved (not failed).
   */
  private async handleAllWorktreesLocked(
    job: RunPlanJob,
    planId: string,
    logContext: string,
  ): Promise<never> {
    const delayMs = WORKTREE_RETRY_DELAY_MS;
    const delayUntil = Date.now() + delayMs;

    this.logger.info(
      `All worktrees locked, moving job to delayed (retryIn=${delayMs}ms), ${logContext}`,
      PlansProcessor.name,
    );

    await this.resetPlanStatusToQueued(planId, 'all_worktrees_locked');

    this.notifications.emitPlanWaitingForWorktree({
      planId,
      retryDelayMs: delayMs,
    });

    await job.moveToDelayed(delayUntil, job.token);

    throw new DelayedError('All worktrees locked, job moved to delayed');
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Plans queue worker shutting down (signal=${signal ?? 'unknown'})`,
      PlansProcessor.name,
    );

    await this.worker.close();
  }

  async process(job: RunPlanJob): Promise<PlanRunJobResult> {
    const { planId } = job.data;
    const jobId = String(job.id);
    const logContext = `${PlansProcessor.name} [planId=${planId}, jobId=${jobId}]`;

    const metricsAtStart = this.processMetrics.getCurrentSnapshot();

    this.logger.info(
      `Plan job started: planId=${planId}, jobId=${jobId}`,
      PlansProcessor.name,
    );

    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });
    const planTitle = plan?.title ?? undefined;

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

    const useWorktree = this.worktreeTracker.listTargets().length > 0;

    const result = useWorktree
      ? await this.processWithWorktree(
          job,
          planId,
          logContext,
          metricsAtStart,
          planTitle,
        )
      : await this.processInProcessCwd(
          planId,
          jobId,
          logContext,
          metricsAtStart,
        );

    if (result.taskRunMetrics) {
      const enhancedMetrics = this.buildEnhancedMetrics(result);
      await this.appendTaskRunMetricsToPlanOutput(planId, enhancedMetrics);
      this.logTaskRunMetrics(planId, jobId, enhancedMetrics);
    }

    return result;
  }

  /**
   * @description Builds an EnhancedTaskRunMetrics object from PlanRunJobResult.
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
   * @description Appends a one-line task-run metrics summary to the plan's output stream so it appears in get_plan_output and activity. Does not throw; logs on failure.
   * Uses formatEnhancedTaskRunMetricsSummary to include child process peak CPU%, wall-clock ratio, and system load when available.
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
   * @description Logs one structured JSON line for external collection (e.g. log aggregators). Includes planId and enhanced taskRunMetrics with child process and wall-clock metrics.
   */
  private logTaskRunMetrics(
    planId: string,
    jobId: string,
    taskRunMetrics: EnhancedTaskRunMetrics,
  ): void {
    this.logger.info(
      JSON.stringify({
        event: 'plan_run_metrics',
        jobId,
        planId,
        taskRunMetrics,
      }),
      PlansProcessor.name,
    );
  }

  /**
   * @description Worktree workflow: acquire target, run Ralph in worktree, ensure commit, release.
   * Returns the workflow result so BullMQ stores it as job returnvalue (API can expose via job query).
   * Attaches task-run metrics (atStart, atEnd) for "CPU and memory while running".
   * Also captures childProcessMetrics and wallClockMetrics from runChildJob for detailed resource usage.
   *
   * Thread-safety: All spawns use explicit cwd from handoff.worktreePath (no process.cwd() or
   * shared path). Flow: runWorktreeWorkflow → runLoop(handoff) → runChildJob({ handoff }) uses
   * handoff.worktreePath for pnpm and git -C; parent-job ensureCommit uses handoff.worktreePath.
   * As safe as processInProcessCwd for concurrency: legacy path uses getWorkspaceRoot() once per
   * job and passes it as explicit cwd; worktree path is per-job explicit cwd with no shared cwd.
   * The worktreeTracker (injected via WORKTREE_TRACKER_TOKEN) is mutex-wrapped for thread-safe
   * acquire/release when CONCURRENCY > 1. See NestjsWorktreesModule and MutexWorktreeTargetsTracker.
   * See docs/workflows/bullmq-processor-worktree.md § Thread-safety and concurrency.
   *
   * When all worktrees are locked ('all_locked'), the job is moved to delayed state and retried
   * after WORKTREE_RETRY_DELAY_MS. This prevents the job from failing immediately and allows it
   * to wait for a worktree to become available.
   */
  private async processWithWorktree(
    job: RunPlanJob,
    planId: string,
    logContext: string,
    metricsAtStart: ProcessMetricsSnapshot,
    planTitle: string | undefined,
  ): Promise<PlanRunJobResult> {
    const jobId = String(job.id);

    let childJobResult: ChildJobResult | undefined;

    const result = await runWorktreeWorkflow({
      acquire: {
        baseBranch: 'main',
        lockedBy: jobId,
        planTitle,
      },
      ensureCommit: { runChecks: true },
      runLoop: async (handoff) => {
        childJobResult = await runChildJob({
          handoff,
          iterations: 10,
          planId,
        });

        if (childJobResult.ok) {
          return { ok: true as const };
        }

        return {
          ok: false as const,
          reason: childJobResult.reason,
          stderr: childJobResult.stderr,
        };
      },

      tracker: this.worktreeTracker,
    });

    const withMetrics = (r: typeof result): PlanRunJobResult => {
      const metricsAtEnd = this.processMetrics.getCurrentSnapshot();
      return {
        ...r,
        childProcessMetrics: childJobResult?.childProcessMetrics,
        taskRunMetrics: { atEnd: metricsAtEnd, atStart: metricsAtStart },
        wallClockMetrics: childJobResult?.wallClockMetrics,
      };
    };

    if (!result.acquire.ok) {
      const { detail, reason } = result.acquire;

      if (detail === 'all_locked') {
        return this.handleAllWorktreesLocked(job, planId, logContext);
      }

      this.logger.warn(
        `Acquire failed: ${reason}${detail ? ` (${detail})` : ''}, ${logContext}`,
        PlansProcessor.name,
      );

      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run skipped (no worktree available): ${planId}`,
        planId,
        severity: 'warning',
      });

      return withMetrics(result);
    }

    if (result.loop && !result.loop.ok) {
      this.logger.warn(
        `Ralph loop failed: ${result.loop.reason}, ${logContext}`,
        PlansProcessor.name,
      );

      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run failed: ${planId} — ${result.loop.reason}`,
        planId,
        severity: 'error',
      });

      return withMetrics(result);
    }

    if (result.ensureCommit && !result.ensureCommit.ok) {
      const { reason } = result.ensureCommit;
      let detail = '';

      if (reason === 'checks_failed' && 'check' in result.ensureCommit) {
        detail = ` [check=${result.ensureCommit.check}]`;
        if (result.ensureCommit.stderr) {
          this.logger.warn(
            `Ensure-commit ${result.ensureCommit.check} stderr: ${result.ensureCommit.stderr.slice(0, 500)}`,
            PlansProcessor.name,
          );
        }
        if (result.ensureCommit.stdout) {
          this.logger.info(
            `Ensure-commit ${result.ensureCommit.check} stdout: ${result.ensureCommit.stdout.slice(0, 500)}`,
            PlansProcessor.name,
          );
        }
      } else if (
        reason === 'working_tree_dirty' &&
        'detail' in result.ensureCommit
      ) {
        detail = result.ensureCommit.detail
          ? ` [dirty=${result.ensureCommit.detail}]`
          : '';
      }

      this.logger.warn(
        `Ensure-commit failed: ${reason}${detail}, ${logContext}`,
        PlansProcessor.name,
      );

      if (result.pushResult) {
        if (result.pushResult.ok) {
          this.logger.info(
            `Branch pushed to remote to preserve work, ${logContext}`,
            PlansProcessor.name,
          );
        } else {
          this.logger.warn(
            `Failed to push branch: ${result.pushResult.stderr}, ${logContext}`,
            PlansProcessor.name,
          );
        }
      }

      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run: ${reason}${detail} — ${planId}`,
        planId,
        severity: 'warning',
      });

      return withMetrics(result);
    }

    if (result.pushResult) {
      if (result.pushResult.ok) {
        this.logger.info(
          `Branch pushed to remote, ${logContext}`,
          PlansProcessor.name,
        );
      } else {
        this.logger.warn(
          `Failed to push branch: ${result.pushResult.stderr}, ${logContext}`,
          PlansProcessor.name,
        );
      }
    }

    this.logger.info(
      `Plan job finished: planId=${planId}, jobId=${jobId}, released=${result.released}`,
      PlansProcessor.name,
    );

    const { message, severity } = await this.getJobCompletedMessageAndSeverity(
      planId,
      `Plan run finished: ${planId}`,
    );

    this.notifications.emitQueueJobCompleted({
      jobType: 'plans',
      message,
      planId,
      severity,
    });

    return withMetrics(result);
  }

  /**
   * @description Legacy: run Ralph in process cwd (no worktrees configured).
   * Returns task-run metrics so job returnvalue includes CPU/memory at start and end.
   */
  private async processInProcessCwd(
    planId: string,
    jobId: string,
    logContext: string,
    metricsAtStart: ProcessMetricsSnapshot,
  ): Promise<PlanRunJobResult> {
    const workspaceRoot = getWorkspaceRoot();
    const args = ['exec', RALPH_CMD, '--plan', planId];

    const onStdout = (chunk: string): void => {
      this.logger.info(chunk.trimEnd(), logContext);
    };
    const onStderr = (chunk: string): void => {
      this.logger.warn(chunk.trimEnd(), logContext);
    };

    try {
      const exitCode = await spawnAndWait(
        'pnpm',
        args,
        { cwd: workspaceRoot },
        onStdout,
        onStderr,
      );

      const defaultSeverity = exitCode === 0 ? 'success' : 'warning';
      this.logger.info(
        `Ralph exited: exitCode=${exitCode ?? 'signal'}, jobId=${jobId}, planId=${planId}, severity=${defaultSeverity}`,
        PlansProcessor.name,
      );

      const defaultMessage = `Plan run finished: ${planId} (exit ${exitCode ?? 'signal'})`;
      const { message, severity } =
        exitCode === 0
          ? await this.getJobCompletedMessageAndSeverity(planId, defaultMessage)
          : { message: defaultMessage, severity: defaultSeverity as 'warning' };
      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message,
        planId,
        severity,
      });

      const metricsAtEnd = this.processMetrics.getCurrentSnapshot();
      return {
        taskRunMetrics: { atEnd: metricsAtEnd, atStart: metricsAtStart },
      };
    } catch (error) {
      const isError = error instanceof Error;

      const msgError = isError ? error.message : String(error);
      const message = `Ralph failed to spawn: ${logContext}, error=${msgError}`;

      this.logger.error(message, PlansProcessor.name);
      this.notifications.emitQueueJobCompleted({
        jobType: 'plans',
        message: `Plan run failed: ${planId} — ${msgError}`,
        planId,
        severity: 'error',
      });

      const metricsAtEnd = this.processMetrics.getCurrentSnapshot();

      return {
        taskRunMetrics: {
          atEnd: metricsAtEnd,
          atStart: metricsAtStart,
        },
      };
    }
  }
}
