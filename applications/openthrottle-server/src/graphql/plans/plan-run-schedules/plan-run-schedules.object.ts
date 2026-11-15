/**
 * @description GraphQL object for a recurring plan-run schedule (plan_run_schedules row). The two
 * occurrence fields are resolved from the schedule's pending SCHEDULED plan_runs row.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('PlanRunSchedule')
export class PlanRunScheduleObject {
  @Field(() => String, {
    description: `Who created the schedule (GitHub username or principal id). Null for system schedules.`,
    nullable: true,
  })
  createdBy!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, {
    description: `Cron pattern (5 fields, evaluated in timezone). Render it for humans on the client.`,
  })
  cronPattern!: string;

  @Field(() => Boolean, {
    description: `False while the schedule is paused: no occurrence is materialized and the pending one was cancelled.`,
  })
  enabled!: boolean;

  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `What happens to an occurrence the server missed: skip (drop it) or run_once (fire a single catch-up run).`,
  })
  misfirePolicy!: string;

  @Field(() => Date, {
    description: `When the next occurrence fires: scheduledFor of the pending SCHEDULED run. Null when the schedule is disabled or has no pending occurrence. Resolved through a batched loader.`,
    nullable: true,
  })
  nextOccurrenceAt?: Date | null;

  @Field(() => ID, {
    description: `The id of the pending SCHEDULED plan run behind nextOccurrenceAt; null when none is waiting.`,
    nullable: true,
  })
  pendingPlanRunId?: string | null;

  @Field(() => ID)
  planId!: string;

  @Field(() => String, {
    description: `JSON object of per-schedule run overrides applied to every materialized run (keys: branch, effort, iterations, model). '{}' means none.`,
  })
  runOverridesJson!: string;

  @Field(() => String, {
    description: `Schedule kind. Only 'cron' exists today.`,
  })
  scheduleKind!: string;

  @Field(() => String, {
    description: `IANA timezone the cron pattern is evaluated in. Null means UTC.`,
    nullable: true,
  })
  timezone!: string | null;

  @Field(() => Date)
  updatedAt!: Date;
}
