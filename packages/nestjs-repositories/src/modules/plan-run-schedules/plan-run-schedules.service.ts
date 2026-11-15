/**
 * @description Typed persistence for plan_run_schedules. Rule storage only: computing the next
 * slot and materializing the SCHEDULED plan_runs row is the scheduler's job, not this service's.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PLAN_RUN_SCHEDULE_MISFIRE_POLICIES } from './plan-run-schedules.constants.ts';
import { PlanRunSchedule } from './plan-run-schedules.entity.ts';
import type {
  CreatePlanRunScheduleInput,
  PlanRunScheduleMisfirePolicy,
  UpdatePlanRunSchedulePatch,
} from './plan-run-schedules.types.ts';

@Injectable()
export class PlanRunSchedulesService {
  constructor(
    @InjectRepository(PlanRunSchedule)
    private readonly repository: Repository<PlanRunSchedule>,
  ) {}

  /** @description Inserts a schedule (kind cron). Defaults: enabled true, misfire skip, no overrides. */
  create(input: CreatePlanRunScheduleInput): Promise<PlanRunSchedule> {
    return this.repository.save(
      this.repository.create({
        createdBy: input.createdBy,
        cronPattern: input.cronPattern,
        enabled: input.enabled ?? true,
        misfirePolicy:
          input.misfirePolicy ?? PLAN_RUN_SCHEDULE_MISFIRE_POLICIES.SKIP,
        planId: input.planId,
        runOverrides: { ...input.runOverrides },
        timezone: input.timezone,
      }),
    );
  }

  /** @description The schedule with this id, or null. */
  findById(id: string): Promise<PlanRunSchedule | null> {
    return this.repository.findOne({ where: { id } });
  }

  /** @description A plan's schedules, oldest first. */
  findByPlanId(planId: string): Promise<PlanRunSchedule[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { planId },
    });
  }

  /** @description The schedules of several plans in one query, oldest first (for batched field resolvers). */
  findByPlanIds(planIds: readonly string[]): Promise<PlanRunSchedule[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { planId: In([...planIds]) },
    });
  }

  /** @description Every enabled schedule across plans, oldest first. */
  listEnabled(): Promise<PlanRunSchedule[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { enabled: true },
    });
  }

  /** @description Enables or disables a schedule. Returns the updated row, or null when missing. */
  setEnabled(id: string, enabled: boolean): Promise<PlanRunSchedule | null> {
    return this.update(id, {
      cronPattern: undefined,
      enabled,
      misfirePolicy: undefined,
      runOverrides: undefined,
      timezone: undefined,
    });
  }

  /**
   * @description Applies the defined fields of `patch` and returns the updated row, or null when
   * the schedule does not exist. A patch with no defined fields just re-reads the row.
   */
  async update(
    id: string,
    patch: UpdatePlanRunSchedulePatch,
  ): Promise<PlanRunSchedule | null> {
    // runOverrides is typed `object` so TypeORM's deep-partial update type does not recurse into
    // the opaque jsonb value (same approach as plan_runs.run_config_snapshot).
    const changes: {
      cronPattern?: string;
      enabled?: boolean;
      misfirePolicy?: PlanRunScheduleMisfirePolicy;
      runOverrides?: object;
      timezone?: string | null;
    } = {};
    if (patch.cronPattern !== undefined) {
      changes.cronPattern = patch.cronPattern;
    }
    if (patch.enabled !== undefined) {
      changes.enabled = patch.enabled;
    }
    if (patch.misfirePolicy !== undefined) {
      changes.misfirePolicy = patch.misfirePolicy;
    }
    if (patch.runOverrides !== undefined) {
      changes.runOverrides = { ...patch.runOverrides };
    }
    if (patch.timezone !== undefined) {
      changes.timezone = patch.timezone;
    }

    if (Object.keys(changes).length > 0) {
      await this.repository.update({ id }, changes);
    }

    return this.findById(id);
  }
}
