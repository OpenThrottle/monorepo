import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PLAN_RUN_STATUS,
  PlanRunsService,
  PlansService,
  STALE_CUTOFF_MS,
  TasksService,
  UNSUPERVISED_STALE_CUTOFF_MS,
} from '@openthrottle/nestjs-repositories';
import {
  PLAN_RUNS_STALE_SWEEP_BATCH_SIZE,
  PLAN_RUNS_STALE_SWEEP_QUEUE_NAME,
} from './plan-runs-stale-sweep.constants';
import type {
  PlanRunsStaleSweepJob,
  PlanRunsStaleSweepSummary,
} from './plan-runs-stale-sweep.types';

const CONCURRENCY = 1;
/** How many recent runs to inspect when deciding whether a plan still has a live run. */
const RECONCILE_RUN_LOOKBACK = 20;

/**
 * @description Stale-plan-run sweeper. Every minute it finds IN_PROGRESS plan_runs whose heartbeat
 * (or, absent one, created_at) is older than STALE_CUTOFF_MS — a run stranded by a HARD crash
 * (SIGKILL/laptop-sleep/power-loss) that skipped the graceful settle path — and settles each to the
 * terminal STALE status with its run-location columns cleared. It then reconciles the plan: if a
 * swept run left the plan IN_PROGRESS with no other live run, the plan (and any IN_PROGRESS tasks)
 * is reset to PENDING so it is re-runnable, since there is no server-side downward reconcile
 * (plan-completion-no-downward-reconcile). Idempotent + batch-capped; only IN_PROGRESS rows past the
 * cutoff match, and settleStaleRun is status-guarded so a graceful settle racing the sweep wins.
 *
 * A SECOND, separate pass covers unsupervised runs (`heartbeat_expected = false`, migration 110),
 * which the first pass excludes because they carry no timer and would all read as stale within two
 * minutes. That pass judges them on sheer AGE against UNSUPERVISED_STALE_CUTOFF_MS (12h) and
 * deliberately does NOT reconcile the plan afterwards: nothing may reset a plan or its tasks to
 * PENDING on the strength of a missing heartbeat, which is the hazard migration 110 exists to
 * avoid. Settling only the run row is what keeps a false positive here harmless — the worst case is
 * a run row marked STALE while its plan and tasks are left exactly as the agent left them.
 */
@Processor(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class PlanRunsStaleSweepProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly planRunsService: PlanRunsService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Plan-runs stale sweep worker started (concurrency=${CONCURRENCY})`,
      PlanRunsStaleSweepProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Plan-runs stale sweep worker shutting down (signal=${signal ?? 'unknown'})`,
      PlanRunsStaleSweepProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: PlanRunsStaleSweepJob): Promise<void> {
    this.logger.info(
      `Plan-runs stale sweep started: jobId=${job.id}`,
      PlanRunsStaleSweepProcessor.name,
    );

    const summary = await this.sweepStalePlanRuns();

    this.logger.info(
      `Plan-runs stale sweep done: examined=${summary.examined}, swept=${summary.swept}, reconciledPlans=${summary.reconciledPlans}, unsupervisedExamined=${summary.unsupervisedExamined}, unsupervisedSwept=${summary.unsupervisedSwept}`,
      PlanRunsStaleSweepProcessor.name,
    );
  }

  private async sweepStalePlanRuns(): Promise<PlanRunsStaleSweepSummary> {
    const cutoff = new Date(Date.now() - STALE_CUTOFF_MS);
    const staleRuns = await this.planRunsService.findStaleInProgressRuns(
      cutoff,
      PLAN_RUNS_STALE_SWEEP_BATCH_SIZE,
    );

    let swept = 0;
    const affectedPlanIds = new Set<string>();

    for (const run of staleRuns) {
      // eslint-disable-next-line no-await-in-loop -- sequential DB writes, one stale run at a time
      const settled = await this.planRunsService.settleStaleRun(run.id);
      if (settled?.status === PLAN_RUN_STATUS.STALE) {
        swept += 1;
        affectedPlanIds.add(run.planId);
      }
    }

    let reconciledPlans = 0;
    for (const planId of affectedPlanIds) {
      // eslint-disable-next-line no-await-in-loop -- sequential DB reconcile, one plan at a time
      const reconciled = await this.reconcileStrandedPlan(planId);
      if (reconciled) {
        reconciledPlans += 1;
      }
    }

    const { unsupervisedExamined, unsupervisedSwept } =
      await this.sweepUnsupervisedPlanRuns();

    return {
      examined: staleRuns.length,
      reconciledPlans,
      swept,
      unsupervisedExamined,
      unsupervisedSwept,
    };
  }

  /**
   * @description Sweeps unsupervised runs (`heartbeat_expected = false`) that are simply too OLD to
   * still be running, settling each to STALE with its run-location columns cleared.
   *
   * There is no reconcile step here, and that omission is the point rather than an oversight. The
   * first pass resets a stranded plan because a heartbeat going quiet is strong evidence its owner
   * died mid-flight. For an unsupervised run there is no such evidence — only age — so rewriting
   * plan and task status on it could undo real work a human is still holding. Settling the run row
   * alone gives the UI an accurate picture and frees the worktree, while leaving every plan/task
   * decision to the agent or the human.
   */
  private async sweepUnsupervisedPlanRuns(): Promise<{
    readonly unsupervisedExamined: number;
    readonly unsupervisedSwept: number;
  }> {
    const cutoff = new Date(Date.now() - UNSUPERVISED_STALE_CUTOFF_MS);
    const runs = await this.planRunsService.findStaleUnsupervisedRuns(
      cutoff,
      PLAN_RUNS_STALE_SWEEP_BATCH_SIZE,
    );

    let unsupervisedSwept = 0;
    for (const run of runs) {
      // eslint-disable-next-line no-await-in-loop -- sequential DB writes, one stale run at a time
      const settled = await this.planRunsService.settleStaleRun(run.id);
      if (settled?.status === PLAN_RUN_STATUS.STALE) {
        unsupervisedSwept += 1;
        this.logger.info(
          `Settled unsupervised run ${run.id} (plan ${run.planId}) to STALE on age; plan/task status untouched`,
          PlanRunsStaleSweepProcessor.name,
        );
      }
    }

    return { unsupervisedExamined: runs.length, unsupervisedSwept };
  }

  /**
   * @description Resets a plan (and its IN_PROGRESS tasks) to PENDING when a swept stale run left it
   * stranded IN_PROGRESS with no other live run. Returns true when the plan was reset. Skips when the
   * plan is not IN_PROGRESS (already terminal/reset) or still has a genuinely live run (IN_PROGRESS
   * or QUEUED), so a healthy concurrent run is never clobbered.
   */
  private async reconcileStrandedPlan(planId: string): Promise<boolean> {
    // NOTE: plans/tasks use the plan_task_status vocabulary (PENDING/IN_PROGRESS/...), which is
    // distinct from plan_runs.status (PLAN_RUN_STATUS). Only run.status comparisons use
    // PLAN_RUN_STATUS below; plan/task writes use the plan_task_status literals.
    const planRepo = this.plansService.getRepository();
    const plan = await planRepo.findOne({ where: { id: planId } });
    if (!plan || plan.status !== 'IN_PROGRESS') {
      return false;
    }

    // After settling stale runs above, a still-IN_PROGRESS or QUEUED run means the plan is genuinely
    // live (another worker/CLI owns it) — do not reset it.
    const recentRuns = await this.planRunsService.findRecentByPlanId(
      planId,
      RECONCILE_RUN_LOOKBACK,
    );
    const hasLiveRun = recentRuns.some(
      (run) =>
        run.status === PLAN_RUN_STATUS.IN_PROGRESS ||
        run.status === PLAN_RUN_STATUS.QUEUED,
    );
    if (hasLiveRun) {
      return false;
    }

    await planRepo.update({ id: planId }, { status: 'PENDING' });
    await this.tasksService
      .getRepository()
      .update({ planId, status: 'IN_PROGRESS' }, { status: 'PENDING' });

    this.logger.info(
      `Reset stranded plan ${planId} (+ IN_PROGRESS tasks) to PENDING after sweeping a stale run`,
      PlanRunsStaleSweepProcessor.name,
    );

    return true;
  }
}
