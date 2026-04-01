/**
 * @description GraphQL input types for activity queries. Replaces multiple @Args with a single input object.
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ActivityByDateInput {
  @Field(() => String, {
    description: `Single date (YYYY-MM-DD). Provide exactly one of date or daysBack.`,
    nullable: true,
  })
  date!: string | null;

  @Field(() => Int, {
    description: `Last N days (1-365). Provide exactly one of date or daysBack.`,
    nullable: true,
  })
  daysBack!: number | null;

  @Field(() => Int, { nullable: true })
  limit!: number | null;

  @Field(() => Int, { nullable: true })
  offset!: number | null;
}

@InputType()
export class ActivityByDateRangeInput {
  @Field(() => String, {
    description: `Start of range (ISO 8601).`,
  })
  startIso!: string;

  @Field(() => String, {
    description: `End of range (ISO 8601).`,
  })
  endIso!: string;

  @Field(() => Int, { nullable: true })
  limit!: number | null;

  @Field(() => Int, { nullable: true })
  offset!: number | null;
}

@InputType()
export class LastActivityInput {
  @Field(() => String, {
    description: `Plan ID (UUID). Returns the single most recent activity for this plan.`,
  })
  planId!: string;

  @Field(() => String, {
    description: `Optional task ID to scope the last activity to that task.`,
    nullable: true,
  })
  taskId!: string | null;
}
