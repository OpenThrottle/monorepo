/**
 * @description GraphQL object type for a BullMQ repeatable/scheduled job. Maps BullMQ getRepeatableJobs() result.
 * Used for cron- or interval-based jobs; job types (e.g. run-plan) and future workflow extensibility
 * are documented on JobObject.name and in the queues schema.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RepeatableJobObject {
  @Field(() => String, {
    description:
      'Unique key for the repeatable job (use with removeRepeatableJob).',
  })
  key!: string;

  @Field(() => String, {
    description: 'Job type name (e.g. run-plan).',
  })
  name!: string;

  @Field(() => String, {
    description: 'Optional job id for the next scheduled run.',
    nullable: true,
  })
  id!: string | null;

  @Field(() => Float, {
    description: 'Unix timestamp when the repeat ends, or null if no end.',
    nullable: true,
  })
  endDate!: number | null;

  @Field(() => String, {
    description: 'Timezone for cron (e.g. Europe/London), or null.',
    nullable: true,
  })
  tz!: string | null;

  @Field(() => String, {
    description: 'Cron pattern (e.g. "0 9 * * 1-5"), or null for every-based.',
    nullable: true,
  })
  pattern!: string | null;

  @Field(() => String, {
    description: 'Interval string (e.g. "1 hour", "2 days"), or null for cron.',
    nullable: true,
  })
  every!: string | null;

  @Field(() => Float, {
    description: 'Unix timestamp of the next run.',
    nullable: true,
  })
  next!: number | null;
}
