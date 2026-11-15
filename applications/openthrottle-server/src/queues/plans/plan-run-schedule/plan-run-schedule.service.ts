import { Injectable } from '@nestjs/common';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunSchedule } from '@openthrottle/nestjs-repositories';
import {
  PLAN_RUN_SCHEDULE_MISFIRE_POLICIES,
  PLAN_STATUS,
  PlanRunSchedulesService,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import { MoreThanOrEqual } from 'typeorm';

import { PlanEnqueueService } from '../../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import { StatusChangeSystemAccountService } from '../../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import {
  PLAN_RUN_SCHEDULE_CATCH_UP_DELAY_MS,
  PLAN_RUN_SCHEDULE_CATCH_UP_MAX_AGE_MS,
} from './plan-run-schedule.constants.ts';
import type {
  PlanRunScheduleChainResult,
  PlanRunScheduleSettleOptions,
} from './plan-run-schedule.types.ts';
import {
  computeNextSlot,
  computePreviousSlot,
} from './plan-run-schedule.utils.ts';

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * @description The owner of recurring plan-run schedules' chain. A schedule keeps exactly ONE future
 * occurrence materialized as an ordinary SCHEDULED `plan_runs` row; whenever an occurrence settles
 * (fired to QUEUED, MISSED, SUPERSEDED, nothing to run, workspace FAILED, CANCELLED) the settle hooks
 * call {@link onScheduledRunSettled}, which materializes the next FUTURE slot — never a backlog, so
 * the per-occurrence grace window alone decides MISSED and there is never more than one catch-up.
 * `misfire_policy` `run_once` swaps the next-slot step for one immediate catch-up run after a miss;
 * `skip` just materializes the next future slot. SUPERSEDED does not stop the chain.
 *
 * The hooks key on "the plan has an enabled schedule", not on the settled run's own schedule id, so a
 * user's one-off run settling also resumes a chain that was waiting behind it. Every public method is
 * best-effort: an error is logged and returned as a value, never thrown into the settle path that
 * called it; the boot {@link reconcileOnStartup} repairs whatever was missed.
 */
@Injectable()
export class PlanRunScheduleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly planEnqueueService: PlanEnqueueService,
    private readonly planRunSchedulesService: PlanRunSchedulesService,
    private readonly planRunsService: PlanRunsService,
    private readonly statusChangeSystemAccount: StatusChangeSystemAccountService,
  ) {}

  /**
   * @description Materializes the schedule's next future occurrence: the first slot strictly after
   * `now` (and after `afterSlot`, when given). A no-op while the schedule already has a SCHEDULED
   * occurrence, so at most one exists at any time. Accepts a schedule row or its id. Never throws.
   */
  async materializeNext(
    scheduleOrId: PlanRunSchedule | string,
    now: Date = new Date(),
    afterSlot: Date | null = null,
  ): Promise<PlanRunScheduleChainResult> {
    try {
      const schedule = await this.resolveSchedule(scheduleOrId);

      if (schedule === null) {
        return { kind: 'schedule_not_found' };
      }
      if (!schedule.enabled) {
        return { kind: 'disabled' };
      }

      const existing = await this.planRunsService.findScheduledByScheduleId(
        schedule.id,
      );

      if (existing !== null) {
        return { kind: 'occurrence_exists', planRunId: existing.id };
      }

      const isSettledSlotLater =
        afterSlot !== null && afterSlot.getTime() > now.getTime();
      const after = isSettledSlotLater ? afterSlot : now;
      const slot = computeNextSlot({
        after,
        cronPattern: schedule.cronPattern,
        timezone: schedule.timezone,
      });

      if (slot === null) {
        this.logger.warn(
          `Schedule ${schedule.id}: no next slot for "${schedule.cronPattern}" (${schedule.timezone ?? 'UTC'}); the chain stops until the schedule is edited.`,
          PlanRunScheduleService.name,
        );

        return { kind: 'no_next_slot' };
      }

      return await this.materialize(schedule, slot, now);
    } catch (error) {
      return this.failed(scheduleOrId, error);
    }
  }

  /**
   * @description The settle hook: continues the chain of every ENABLED schedule of `planId` after one
   * of the plan's SCHEDULED runs settled (and, via the cancel path, was cancelled). Call it after the
   * settling transaction committed. For a `run_once` schedule whose own occurrence just went MISSED
   * (`options.missedRunScheduleId`) it fires one immediate catch-up; every other case materializes
   * the next future slot ({@link materializeNext}). Best-effort: never throws.
   */
  async onScheduledRunSettled(
    planId: string,
    now: Date = new Date(),
    options: Partial<PlanRunScheduleSettleOptions> = {},
  ): Promise<readonly PlanRunScheduleChainResult[]> {
    let schedules: PlanRunSchedule[];

    try {
      schedules = (
        await this.planRunSchedulesService.findByPlanId(planId)
      ).filter((schedule) => schedule.enabled);
    } catch (error) {
      this.logger.warn(
        `Could not read the schedules of plan ${planId} after a scheduled run settled: ${describeError(error)}`,
        PlanRunScheduleService.name,
      );

      return [];
    }

    return Promise.all(
      schedules.map((schedule) => {
        const isOwnMiss =
          options.missedRunScheduleId === schedule.id &&
          schedule.misfirePolicy ===
            PLAN_RUN_SCHEDULE_MISFIRE_POLICIES.RUN_ONCE;

        return isOwnMiss
          ? this.materializeCatchUp(schedule, now)
          : this.materializeNext(schedule, now, options.settledSlot ?? null);
      }),
    );
  }

  /**
   * @description The D7 hook: call after a status change that left SCHEDULED committed, with the
   * SCHEDULED run ids it cancelled. Does nothing when no run was cancelled. A terminal target
   * (CANCELED or COMPLETED) disables every enabled schedule of the plan and materializes nothing;
   * any other target resumes the chain ({@link onScheduledRunSettled}). Best-effort: never throws.
   */
  async onPlanStatusChangedCancellingOccurrence(
    planId: string,
    newStatus: string,
    cancelledScheduledRunIds: readonly string[],
  ): Promise<void> {
    if (cancelledScheduledRunIds.length === 0) {
      return;
    }

    try {
      const isTerminal =
        newStatus === PLAN_STATUS.CANCELED ||
        newStatus === PLAN_STATUS.COMPLETED;

      if (!isTerminal) {
        await this.onScheduledRunSettled(planId);

        return;
      }

      const schedules = (
        await this.planRunSchedulesService.findByPlanId(planId)
      ).filter((schedule) => schedule.enabled);

      await Promise.all(
        schedules.map((schedule) => {
          return this.planRunSchedulesService.setEnabled(schedule.id, false);
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Plan ${planId} left SCHEDULED for ${newStatus}: could not update its schedules: ${describeError(error)}; the next boot reconcile repairs a chain.`,
        PlanRunScheduleService.name,
      );
    }
  }

  /**
   * @description Boot reconcile, called next to the scheduled-run reconcile and only on the
   * repeatables owner. For every enabled schedule with NO SCHEDULED occurrence (it was disabled and
   * re-enabled, the process died between a settle and its hook, or the plan held a one-off): a
   * `run_once` schedule whose most recent past slot is unserved fires one catch-up, anything else
   * materializes the next future slot. "Unserved" means no `plan_runs` row of the schedule has
   * `scheduled_for` at or after that slot (a MISSED or catch-up row counts as serving it), the slot
   * is after the schedule was created or last edited, and it is at most
   * {@link PLAN_RUN_SCHEDULE_CATCH_UP_MAX_AGE_MS} old. Best-effort per schedule; never throws.
   */
  async reconcileOnStartup(
    now: Date = new Date(),
  ): Promise<readonly PlanRunScheduleChainResult[]> {
    let schedules: PlanRunSchedule[];

    try {
      schedules = await this.planRunSchedulesService.listEnabled();
    } catch (error) {
      this.logger.warn(
        `Plan run schedule reconciliation skipped: could not read the schedules: ${describeError(error)}`,
        PlanRunScheduleService.name,
      );

      return [];
    }

    return Promise.all(
      schedules.map((schedule) => this.reconcileSchedule(schedule, now)),
    );
  }

  private async reconcileSchedule(
    schedule: PlanRunSchedule,
    now: Date,
  ): Promise<PlanRunScheduleChainResult> {
    try {
      const existing = await this.planRunsService.findScheduledByScheduleId(
        schedule.id,
      );

      if (existing !== null) {
        return { kind: 'occurrence_exists', planRunId: existing.id };
      }

      const catchUp =
        schedule.misfirePolicy ===
          PLAN_RUN_SCHEDULE_MISFIRE_POLICIES.RUN_ONCE &&
        (await this.hasUnservedPastSlot(schedule, now));

      return catchUp
        ? await this.materializeCatchUp(schedule, now)
        : await this.materializeNext(schedule, now);
    } catch (error) {
      return this.failed(schedule, error);
    }
  }

  /** @description True when the schedule's latest past slot is recent, post-dates its last edit and has no run. */
  private async hasUnservedPastSlot(
    schedule: PlanRunSchedule,
    now: Date,
  ): Promise<boolean> {
    const previous = computePreviousSlot({
      at: now,
      cronPattern: schedule.cronPattern,
      timezone: schedule.timezone,
    });

    if (previous === null) {
      return false;
    }

    const editedAt = Math.max(
      schedule.createdAt.getTime(),
      schedule.updatedAt.getTime(),
    );

    if (
      previous.getTime() <= editedAt ||
      now.getTime() - previous.getTime() > PLAN_RUN_SCHEDULE_CATCH_UP_MAX_AGE_MS
    ) {
      return false;
    }

    const served = await this.planRunsService.getRepository().findOne({
      where: {
        planRunScheduleId: schedule.id,
        scheduledFor: MoreThanOrEqual(previous),
      },
    });

    return served === null;
  }

  /**
   * @description The `run_once` catch-up: one occurrence scheduled {@link PLAN_RUN_SCHEDULE_CATCH_UP_DELAY_MS}
   * from now so the ordinary fire path runs it. A no-op while the schedule already has an occurrence.
   */
  private async materializeCatchUp(
    schedule: PlanRunSchedule,
    now: Date,
  ): Promise<PlanRunScheduleChainResult> {
    try {
      const existing = await this.planRunsService.findScheduledByScheduleId(
        schedule.id,
      );

      if (existing !== null) {
        return { kind: 'occurrence_exists', planRunId: existing.id };
      }

      return await this.materialize(
        schedule,
        new Date(now.getTime() + PLAN_RUN_SCHEDULE_CATCH_UP_DELAY_MS),
        now,
      );
    } catch (error) {
      return this.failed(schedule, error);
    }
  }

  private async materialize(
    schedule: PlanRunSchedule,
    scheduledFor: Date,
    now: Date,
  ): Promise<PlanRunScheduleChainResult> {
    const actorSub = await this.statusChangeSystemAccount.resolveId();
    const outcome = await this.planEnqueueService.materializeScheduleOccurrence(
      {
        actorKind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        actorSub: actorSub ?? undefined,
        now,
        schedule,
        scheduledFor,
      },
    );

    if (outcome.kind === 'materialized') {
      this.logger.info(
        `Schedule ${schedule.id}: materialized run ${outcome.planRunId} for ${scheduledFor.toISOString()} (plan ${schedule.planId}${outcome.planStatusMoved ? ' -> SCHEDULED' : ''}).`,
        PlanRunScheduleService.name,
      );
    }

    return { kind: 'attempted', outcome };
  }

  private async resolveSchedule(
    scheduleOrId: PlanRunSchedule | string,
  ): Promise<PlanRunSchedule | null> {
    if (typeof scheduleOrId === 'string') {
      return this.planRunSchedulesService.findById(scheduleOrId);
    }

    return scheduleOrId;
  }

  private failed(
    scheduleOrId: PlanRunSchedule | string,
    error: unknown,
  ): PlanRunScheduleChainResult {
    const id =
      typeof scheduleOrId === 'string' ? scheduleOrId : scheduleOrId.id;
    const reason = describeError(error);

    this.logger.warn(
      `Schedule ${id}: could not continue the chain: ${reason}; the next settle or boot reconcile retries.`,
      PlanRunScheduleService.name,
    );

    return { kind: 'failed', reason };
  }
}
