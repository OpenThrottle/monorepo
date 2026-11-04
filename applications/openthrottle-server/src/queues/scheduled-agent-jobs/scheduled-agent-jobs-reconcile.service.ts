import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type ScheduledAgentJob,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import { SCHEDULED_RUN_FAILURE_REASONS } from '@openthrottle/openthrottle-notifications';

import { resolveRepeatablesOwner } from '../repeatable-job.owner.ts';
import { ScheduledAgentJobFailureNotifierService } from './scheduled-agent-job-failure-notifier.service.ts';
import { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service.ts';
import {
  listCronSlotsBetween,
  missedLateMessage,
  missedSupersededMessage,
  planBootMisfire,
  SCHEDULED_AGENT_JOB_MISFIRE_LOOKBACK_MS,
  SCHEDULED_AGENT_JOB_MISSED_RECORD_LIMIT,
} from './scheduled-agent-jobs.misfire.ts';
import { isSelfScheduledKind } from './scheduled-agent-jobs.schedule-kind.ts';

/**
 * @description Boot-time convergence of BullMQ schedulers to the DB (the authority): registers every
 * enabled schedule and removes any owned scheduler with no enabled row (orphan sweep — self-heals an
 * out-of-band removeJobScheduler / manual Redis edit on the next worker start). Lives in the worker
 * module so an api-only process never runs it. On-mutation upsert/remove is handled directly by the
 * shared {@link ScheduledAgentJobSchedulerService} from the GraphQL layer, NOT here.
 *
 * Before re-upserting a schedule it settles the fires the server was down for, under the job's
 * misfire policy (see `scheduled-agent-jobs.misfire.ts`): each is recorded as a `missed` run, except
 * the one late run the policy allows, which is enqueued explicitly. The re-upsert then deletes
 * BullMQ's surviving overdue job if the worker has not already claimed it — and if it has, the
 * processor applies the same policy and the run row's unique slot index keeps it to one run.
 *
 * Gated by {@link resolveRepeatablesOwner} (the same check every repeatable service uses) so a
 * shared-DB worktree never registers a second copy of the schedule set; in production (single
 * worker) the guard always owns.
 */
@Injectable()
export class ScheduledAgentJobsReconcileService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly scheduler: ScheduledAgentJobSchedulerService,
    private readonly failureNotifier: ScheduledAgentJobFailureNotifierService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Scheduled-agent-jobs boot reconcile skipped: ${ownership.reason}`,
        ScheduledAgentJobsReconcileService.name,
      );
      return;
    }

    await this.reconcile();
  }

  /**
   * @description Idempotent DB→BullMQ convergence: settle each enabled schedule's missed fires, upsert
   * it (storing its next-run time), and remove owned schedulers with no enabled row. Safe to run
   * repeatedly: missed rows and the catch-up are keyed by slot, so a second pass adds nothing.
   */
  async reconcile(): Promise<void> {
    const bootAt = new Date(Date.now() - process.uptime() * 1_000);
    const enabled = await this.jobsService.listEnabledJobs();
    const enabledKeys = new Set(enabled.map((job) => job.schedulerKey));

    for (const job of enabled) {
      // eslint-disable-next-line no-await-in-loop -- must finish before this job's re-upsert, small N
      await this.settleMissedFires(job, bootAt);
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent upserts, small N
      const next = await this.scheduler.upsertScheduler(job);
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent DB writes, small N
      await this.jobsService.updateNextRunAt(job.id, next);
    }

    const existingIds = await this.scheduler.listOwnedSchedulerIds();
    let removed = 0;
    for (const schedulerId of existingIds) {
      if (enabledKeys.has(schedulerId)) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent orphan removals, small N
      await this.scheduler.removeScheduler(schedulerId);
      removed += 1;
    }

    this.logger.info(
      `Scheduled-agent-jobs reconciled: registered=${enabled.length}, orphansRemoved=${removed}`,
      ScheduledAgentJobsReconcileService.name,
    );
  }

  /**
   * @description Records the slots that came due while the server was down and enqueues the one late
   * run the misfire policy allows. Never throws: a failure here must not stop the schedule from being
   * registered, so it is logged and the boot carries on.
   *
   * The window is (anchor, bootAt]. The anchor is the latest of: the newest slot already on record
   * (from before this boot), the schedule's `updatedAt` (an edit, enable, or the last run's
   * `lastRunAt` write — none can happen while the server is down), and the lookback floor. Slots after
   * `bootAt` belong to the live scheduler.
   */
  private async settleMissedFires(
    job: ScheduledAgentJob,
    bootAt: Date,
  ): Promise<void> {
    // An interval or once fire the server was down for keeps its slot and runs once, late: the
    // re-upsert that follows re-arms it with no delay. There is no train of slots to account for.
    if (job.cronPattern === null || isSelfScheduledKind(job.scheduleKind)) {
      return;
    }

    try {
      const now = new Date();
      const anchor = await this.missedFireAnchor(job, bootAt);
      const { droppedCount, slots } = listCronSlotsBetween({
        after: anchor,
        before: bootAt,
        cronPattern: job.cronPattern,
        limit: SCHEDULED_AGENT_JOB_MISSED_RECORD_LIMIT,
        timezone: job.timezone,
      });
      if (slots.length === 0) return;

      const policy = {
        policy: job.misfirePolicy,
        thresholdMs: job.misfireThresholdMs,
      };
      const plan = planBootMisfire({ now, slots, ...policy });

      // The worker may already have claimed BullMQ's surviving overdue job during this boot; that run
      // is then the outage's one late run, and the planned catch-up is recorded as superseded.
      const catchUpAlreadyRan =
        plan.catchUpSlot !== null &&
        (await this.jobsService.hasLateRunSince(job.id, bootAt));
      const catchUpSlot = catchUpAlreadyRan ? null : plan.catchUpSlot;
      const supersededSlots =
        catchUpAlreadyRan && plan.catchUpSlot !== null
          ? [...plan.supersededSlots, plan.catchUpSlot]
          : plan.supersededSlots;
      const base = {
        driverId: job.driverId,
        model: job.model,
        scheduledAgentJobId: job.id,
      };

      // Missed rows go in BEFORE the catch-up is enqueued, so a worker that claims the surviving
      // overdue job from here on finds its slot taken (unless that slot is the catch-up itself).
      const [lateCount, supersededCount] = await Promise.all([
        this.jobsService.recordMissedRuns({
          ...base,
          errorMessage: missedLateMessage(policy),
          slots: plan.lateSlots,
        }),
        this.jobsService.recordMissedRuns({
          ...base,
          errorMessage: missedSupersededMessage(policy),
          slots: supersededSlots,
        }),
      ]);

      if (catchUpSlot !== null) {
        await this.scheduler.enqueueCatchUp(job, catchUpSlot);
      }

      // One notice per schedule per boot, however long the outage, so a week down is not a week of
      // toasts. The run history carries each slot's own reason.
      await this.failureNotifier.notify({
        errorMessage:
          lateCount > 0
            ? missedLateMessage(policy)
            : missedSupersededMessage(policy),
        reason: SCHEDULED_RUN_FAILURE_REASONS.MISSED,
        runCount: lateCount + supersededCount,
        runId: undefined,
        scheduledAgentJobId: job.id,
      });

      const dropped =
        droppedCount > 0 ? ` (${droppedCount} older not recorded)` : '';
      const catchUp =
        catchUpSlot === null
          ? 'none'
          : `enqueued for ${catchUpSlot.toISOString()}`;
      this.logger.info(
        `Scheduled agent job ${job.id}: ${slots.length + droppedCount} fire(s) came due while the server was down; recorded ${lateCount + supersededCount} missed${dropped}, catch-up ${catchUp} (policy ${job.misfirePolicy})`,
        ScheduledAgentJobsReconcileService.name,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Scheduled agent job ${job.id}: could not settle missed fires: ${message}`,
        ScheduledAgentJobsReconcileService.name,
      );
    }
  }

  /** @description Where the missed-fire window starts for a schedule; see {@link settleMissedFires}. */
  private async missedFireAnchor(
    job: ScheduledAgentJob,
    bootAt: Date,
  ): Promise<Date> {
    const latestSlot = await this.jobsService.findLatestScheduledFor(
      job.id,
      bootAt,
    );
    // An updatedAt from this boot (a late run already finished) says nothing about the outage.
    const updatedBeforeBoot =
      job.updatedAt.getTime() < bootAt.getTime() ? job.updatedAt.getTime() : 0;

    return new Date(
      Math.max(
        latestSlot?.getTime() ?? 0,
        updatedBeforeBoot,
        bootAt.getTime() - SCHEDULED_AGENT_JOB_MISFIRE_LOOKBACK_MS,
      ),
    );
  }
}
