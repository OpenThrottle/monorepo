import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PLAN_RUN_STATUS,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';

import type { ScheduledRunFireOutcome } from '../../graphql/plans/plan-enqueue.service.ts';
import { PlanEnqueueService } from '../../graphql/plans/plan-enqueue.service.ts';
import { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account.service.ts';
import { NotificationsService } from '../../notifications/notifications.service.ts';
import {
  PLANS_QUEUE_NAME,
  SCHEDULED_PLAN_RUN_RECONCILE_LIMIT,
} from './plans.constants.ts';
import type { PlanRunJobResult, RunPlanJobData } from './plans.types.ts';
import { decideScheduledPlanRunReproject } from './scheduled-plan-run.utils.ts';

/** @description What the boot reconcile did with one SCHEDULED run. */
type ScheduledRunReconcileResult =
  | 'failed'
  | 'job_present'
  | 'missed'
  | 'reprojected'
  | 'settled_elsewhere'
  | 'skipped';

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * @description The worker-side owner of scheduled plan runs: applies the fire-time policy when a
 * scheduled run's delayed job fires ({@link ScheduledPlanRunService.fire}) and re-projects lost
 * delayed jobs at boot ({@link ScheduledPlanRunService.reconcileOnStartup}). The policy itself is
 * pure (`scheduled-plan-run.utils.ts`); the transaction that applies it at fire time lives in
 * {@link PlanEnqueueService.fireScheduledRun}, next to the enqueue status writes it reuses. MISSED and
 * SUPERSEDED both notify through {@link NotificationsService}, as the usage-limit park path does.
 */
@Injectable()
export class ScheduledPlanRunService {
  constructor(
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly planEnqueueService: PlanEnqueueService,
    private readonly planRunsService: PlanRunsService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, PlanRunJobResult | void>,
    private readonly statusChangeSystemAccount: StatusChangeSystemAccountService,
  ) {}

  /**
   * @description Applies the fire-time policy to a SCHEDULED run whose delayed job just fired and
   * reports the outcome. Only `fire` lets the job go on (the run is then QUEUED, as are the plan and
   * its runnable tasks); every other outcome means the run must not start, and the caller returns
   * without any side effect. MISSED and SUPERSEDED notify the user (warning), a run with nothing to run
   * notifies as info, and a run a concurrent cancel already settled (`not_scheduled`) is only logged —
   * the cancel was the user's own action. `now` is injectable for tests. Throws on a database error.
   */
  async fire(params: {
    readonly now?: Date;
    readonly run: PlanRun;
  }): Promise<ScheduledRunFireOutcome> {
    const { run } = params;
    const now = params.now ?? new Date();
    const actorSub = await this.statusChangeSystemAccount.resolveId();
    const outcome = await this.planEnqueueService.fireScheduledRun({
      actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      actorSub: actorSub ?? undefined,
      now,
      planId: run.planId,
      planRunId: run.id,
    });
    const scheduledLabel = run.scheduledFor?.toISOString() ?? 'an unknown time';

    switch (outcome.kind) {
      case 'fire':
        this.logger.info(
          `Scheduled plan run ${run.id} (scheduled for ${scheduledLabel}) fired: plan ${run.planId} queued.`,
          ScheduledPlanRunService.name,
        );
        break;
      case 'missed':
        this.notifyNotStarted(
          run,
          `Scheduled plan run missed: it was due at ${scheduledLabel} and ${outcome.reason}, so it was not started.`,
          'warning',
        );
        break;
      case 'nothing_to_run':
        this.notifyNotStarted(
          run,
          `Scheduled plan run skipped: ${outcome.reason} at ${scheduledLabel}.`,
          'info',
        );
        break;
      case 'not_scheduled':
        this.logger.info(
          `Scheduled plan run ${run.id} was no longer SCHEDULED when its job fired (cancelled meanwhile); not starting it.`,
          ScheduledPlanRunService.name,
        );
        break;
      case 'superseded':
        this.notifyNotStarted(
          run,
          `Scheduled plan run superseded: ${outcome.reason} at ${scheduledLabel}, so the scheduled run was not started.`,
          'warning',
        );
        break;
    }

    return outcome;
  }

  /**
   * @description Boot reconcile for scheduled runs, following the plans worker's other startup
   * reconciles (and, like them, called only on the repeatables owner — a shared-DB worktree's queue
   * is its own Redis prefix, so it would see every scheduled job as missing and re-project them into
   * the wrong queue). For each SCHEDULED row with a job id ({@link PlanRunsService.findScheduledRunsWithJob}):
   *
   * - its delayed job is still in BullMQ (any state) → untouched;
   * - the job is missing and the run is within the grace window → the job is re-created with the time
   *   still left, or immediately when it is already due ({@link PlanEnqueueService.reprojectScheduledRun});
   * - the job is missing and the run is past the grace window → settled MISSED and the user notified.
   *
   * Live interactive and detached-CLI plans stay out of it by construction, as PR #620 keeps them out
   * of the plan-status reconcile: only rows that carry a BullMQ job id are candidates (those runs never
   * do), and this reconcile writes nothing but the scheduled row and its job — never a plan or task
   * status. Whether a re-projected run may start alongside a live run is decided when it fires, by the
   * collision hold.
   *
   * Best-effort per run: a failure is logged and leaves that row SCHEDULED for the next boot. Never
   * throws, so it cannot block the server from starting. `now` is injectable for tests.
   */
  async reconcileOnStartup(
    now: Date = new Date(),
  ): Promise<readonly ScheduledRunReconcileResult[]> {
    let runs: PlanRun[];

    try {
      runs = await this.planRunsService.findScheduledRunsWithJob(
        SCHEDULED_PLAN_RUN_RECONCILE_LIMIT,
      );
    } catch (error) {
      this.logger.warn(
        `Scheduled plan run reconciliation skipped: could not read SCHEDULED runs: ${describeError(error)}`,
        ScheduledPlanRunService.name,
      );

      return [];
    }

    return Promise.all(runs.map((run) => this.reconcileRun(run, now)));
  }

  private async reconcileRun(
    run: PlanRun,
    now: Date,
  ): Promise<ScheduledRunReconcileResult> {
    const { bullmqJobId, scheduledFor } = run;

    // The query only returns rows with both; this narrows the types.
    if (bullmqJobId === null || scheduledFor === null) {
      return 'skipped';
    }

    try {
      const job = await this.plansQueue.getJob(bullmqJobId);

      if (job) {
        return 'job_present';
      }

      const decision = decideScheduledPlanRunReproject({ now, scheduledFor });

      if (decision.kind === 'missed') {
        const settled = await this.planRunsService.transitionScheduledRun(
          run.id,
          PLAN_RUN_STATUS.MISSED,
        );

        if (!settled) {
          return 'settled_elsewhere';
        }

        this.notifyNotStarted(
          run,
          `Scheduled plan run missed: it was due at ${scheduledFor.toISOString()} and ${decision.reason} when the server came back, so it was not started.`,
          'warning',
        );

        return 'missed';
      }

      await this.planEnqueueService.reprojectScheduledRun({
        delayMs: decision.delayMs,
        run,
      });

      this.logger.info(
        `Scheduled plan run reconciliation: re-created the lost job ${bullmqJobId} for run ${run.id} (fires in ${decision.delayMs}ms).`,
        ScheduledPlanRunService.name,
      );

      return 'reprojected';
    } catch (error) {
      this.logger.warn(
        `Scheduled plan run reconciliation failed for run ${run.id} (job ${bullmqJobId}); leaving it SCHEDULED for the next boot: ${describeError(error)}`,
        ScheduledPlanRunService.name,
      );

      return 'failed';
    }
  }

  private notifyNotStarted(
    run: PlanRun,
    message: string,
    severity: 'info' | 'warning',
  ): void {
    this.logger.info(
      `${message} (run ${run.id}, plan ${run.planId})`,
      ScheduledPlanRunService.name,
    );
    this.notifications.emitQueueJobCompleted({
      jobType: 'plans',
      message,
      planId: run.planId,
      severity,
    });
  }
}
