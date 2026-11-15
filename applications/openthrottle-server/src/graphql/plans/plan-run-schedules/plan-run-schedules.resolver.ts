/**
 * @description Resolver for recurring plan-run schedules: the create / update / enable mutations and
 * the per-schedule occurrence fields. A schedule keeps ONE pending SCHEDULED plan_runs row, owned by
 * {@link PlanRunScheduleService}; this resolver only edits the rule and keeps that row in step —
 * cancelling the pending occurrence when the rule changes or the schedule is disabled, and
 * materializing the next slot when it changes or is re-enabled. PlanObject.runSchedules lives on
 * PlansResolver next to the plan's other field resolvers.
 */

import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import type { PlanRunSchedule } from '@openthrottle/nestjs-repositories';
import {
  PlanRunSchedulesService,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';

import { PlanRunScheduleService } from '../../../queues/plans/plan-run-schedule/plan-run-schedule.service.ts';
import { PlansLoaders } from '../loaders/loaders.service.ts';
import { PlanStatusService } from '../plan-status/plan-status.service.ts';
import {
  CreatePlanRunScheduleInput,
  SetPlanRunScheduleEnabledInput,
  UpdatePlanRunScheduleInput,
} from './plan-run-schedules.input.ts';
import { PlanRunScheduleObject } from './plan-run-schedules.object.ts';
import {
  assertValidCron,
  mapPlanRunScheduleObject,
  normalizeTimezone,
  parseOptionalMisfirePolicy,
  parseOptionalRunOverrides,
} from './plan-run-schedules.utils.ts';

// @authz-stance: authenticated-only, like schedulePlanRun and cancelPlanRun (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
@Resolver(() => PlanRunScheduleObject)
export class PlanRunSchedulesResolver {
  constructor(
    private readonly loaders: PlansLoaders,
    private readonly planRunScheduleService: PlanRunScheduleService,
    private readonly planRunSchedulesService: PlanRunSchedulesService,
    private readonly planRunsService: PlanRunsService,
    private readonly planStatusService: PlanStatusService,
  ) {}

  @ResolveField(() => Date, {
    description: `When the next occurrence fires: scheduledFor of the pending SCHEDULED run. Null when the schedule is disabled or has no pending occurrence. Resolved through a batched loader.`,
    nullable: true,
  })
  async nextOccurrenceAt(
    @Parent() parent: PlanRunScheduleObject,
  ): Promise<Date | null> {
    const run = await this.loaders.scheduledRunByScheduleIdLoader.load(
      parent.id,
    );

    return run?.scheduledFor ?? null;
  }

  @ResolveField(() => ID, {
    description: `The id of the pending SCHEDULED plan run behind nextOccurrenceAt; null when none is waiting.`,
    nullable: true,
  })
  async pendingPlanRunId(
    @Parent() parent: PlanRunScheduleObject,
  ): Promise<string | null> {
    const run = await this.loaders.scheduledRunByScheduleIdLoader.load(
      parent.id,
    );

    return run?.id ?? null;
  }

  @Mutation(() => PlanRunScheduleObject, {
    description: `Create a recurring schedule for a plan and materialize its first occurrence as a SCHEDULED run. Rejects a cron pattern or timezone the scheduler cannot honour (extensions: BAD_REQUEST with the reason), an unknown misfirePolicy and run overrides other than branch / effort / iterations / model.`,
  })
  async createPlanRunSchedule(
    @Args('input', { type: () => CreatePlanRunScheduleInput })
    input: CreatePlanRunScheduleInput,
    @CurrentUser('sub') actorSub?: string,
  ): Promise<PlanRunScheduleObject> {
    const timezone = normalizeTimezone(input.timezone);

    assertValidCron(input.cronPattern, timezone);

    const misfirePolicy = parseOptionalMisfirePolicy(input.misfirePolicy);
    const runOverrides = parseOptionalRunOverrides(input.runOverridesJson);

    const schedule = await this.planRunSchedulesService.create({
      createdBy: actorSub ?? null,
      cronPattern: input.cronPattern.trim(),
      enabled: true,
      misfirePolicy,
      planId: input.planId,
      runOverrides,
      timezone,
    });

    await this.planRunScheduleService.materializeNext(schedule);

    return mapPlanRunScheduleObject(schedule);
  }

  @Mutation(() => PlanRunScheduleObject, {
    description: `Edit a schedule. Validated like createPlanRunSchedule against the merged rule. When the cron pattern or timezone changed, the pending occurrence is cancelled and the next slot of the new rule is materialized (an enabled schedule only).`,
  })
  async updatePlanRunSchedule(
    @Args('input', { type: () => UpdatePlanRunScheduleInput })
    input: UpdatePlanRunScheduleInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PlanRunScheduleObject> {
    const existing = await this.requireSchedule(input.id);
    const cronPattern = input.cronPattern?.trim() ?? existing.cronPattern;
    const isTimezoneProvided =
      input.timezone !== undefined && input.timezone !== null;
    const timezone = isTimezoneProvided
      ? normalizeTimezone(input.timezone)
      : existing.timezone;

    assertValidCron(cronPattern, timezone);

    const misfirePolicy = parseOptionalMisfirePolicy(input.misfirePolicy);
    const runOverrides = parseOptionalRunOverrides(input.runOverridesJson);
    const hasRuleChanged =
      cronPattern !== existing.cronPattern || timezone !== existing.timezone;

    const updated = await this.planRunSchedulesService.update(input.id, {
      cronPattern: hasRuleChanged ? cronPattern : undefined,
      enabled: undefined,
      misfirePolicy,
      runOverrides,
      timezone: hasRuleChanged ? timezone : undefined,
    });

    if (updated === null) {
      throw new NotFoundException(`Plan run schedule not found: ${input.id}`);
    }

    if (hasRuleChanged && updated.enabled) {
      await this.cancelPendingOccurrence(updated, actorSub, actorKind);
      await this.planRunScheduleService.materializeNext(updated);
    }

    return mapPlanRunScheduleObject(updated);
  }

  @Mutation(() => PlanRunScheduleObject, {
    description: `Pause or resume a schedule. Disabling cancels the pending occurrence (and nothing re-materializes it while disabled); enabling materializes the next slot.`,
  })
  async setPlanRunScheduleEnabled(
    @Args('input', { type: () => SetPlanRunScheduleEnabledInput })
    input: SetPlanRunScheduleEnabledInput,
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<PlanRunScheduleObject> {
    await this.requireSchedule(input.id);

    const updated = await this.planRunSchedulesService.setEnabled(
      input.id,
      input.enabled,
    );

    if (updated === null) {
      throw new NotFoundException(`Plan run schedule not found: ${input.id}`);
    }

    if (input.enabled) {
      await this.planRunScheduleService.materializeNext(updated);
    } else {
      await this.cancelPendingOccurrence(updated, actorSub, actorKind);
    }

    return mapPlanRunScheduleObject(updated);
  }

  private async requireSchedule(id: string): Promise<PlanRunSchedule> {
    const schedule = await this.planRunSchedulesService.findById(id);

    if (schedule === null) {
      throw new NotFoundException(`Plan run schedule not found: ${id}`);
    }

    return schedule;
  }

  /**
   * @description Cancels the schedule's pending SCHEDULED occurrence, if any. Deliberately does NOT
   * call the settle hook: callers decide whether to re-materialize (an edit does; a disable must not,
   * and the hook skips disabled schedules regardless).
   */
  private async cancelPendingOccurrence(
    schedule: PlanRunSchedule,
    actorSub: string | undefined,
    actorKind: string | undefined,
  ): Promise<void> {
    const pending = await this.planRunsService.findScheduledByScheduleId(
      schedule.id,
    );

    if (pending === null) {
      return;
    }

    await this.planStatusService.cancelRun(
      schedule.planId,
      actorKind === AUTH_PRINCIPAL_KIND_USER ? (actorSub ?? null) : null,
      { actorKind, actorSub },
      pending.id,
    );
  }
}
