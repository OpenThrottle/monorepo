/**
 * @description GraphQL inputs for the plan-run schedule mutations. Optional fields are the GraphQL
 * nullable convention: omitted or null means "not provided" (timezone null on update resets to UTC).
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreatePlanRunScheduleInput {
  @Field(() => String, {
    description: `REQUIRED cron pattern (5 fields). Consecutive runs must be at least the minimum interval apart; the server rejects anything else with the reason.`,
  })
  cronPattern!: string;

  @Field(() => String, {
    description: `Optional misfire policy: skip (default) or run_once.`,
    nullable: true,
  })
  misfirePolicy?: string | null;

  @Field(() => ID, { description: `The plan to recur.` })
  planId!: string;

  @Field(() => String, {
    description: `Optional JSON object of run overrides; only branch, effort, iterations and model are accepted.`,
    nullable: true,
  })
  runOverridesJson?: string | null;

  @Field(() => String, {
    description: `Optional IANA timezone name (e.g. America/New_York). Omitted means UTC.`,
    nullable: true,
  })
  timezone?: string | null;
}

@InputType()
export class UpdatePlanRunScheduleInput {
  @Field(() => String, {
    description: `New cron pattern. Changing it (or the timezone) cancels the pending occurrence and materializes the next slot of the new rule.`,
    nullable: true,
  })
  cronPattern?: string | null;

  @Field(() => ID, { description: `The schedule to update.` })
  id!: string;

  @Field(() => String, { nullable: true })
  misfirePolicy?: string | null;

  @Field(() => String, {
    description: `Replaces the run overrides (JSON object; branch, effort, iterations, model). Applies from the next materialized occurrence.`,
    nullable: true,
  })
  runOverridesJson?: string | null;

  @Field(() => String, {
    description: `New IANA timezone. Send an empty string to reset to UTC; omit or null to leave it unchanged.`,
    nullable: true,
  })
  timezone?: string | null;
}

@InputType()
export class SetPlanRunScheduleEnabledInput {
  @Field(() => Boolean, {
    description: `False pauses the schedule and cancels its pending occurrence; true resumes it and materializes the next slot.`,
  })
  enabled!: boolean;

  @Field(() => ID)
  id!: string;
}
