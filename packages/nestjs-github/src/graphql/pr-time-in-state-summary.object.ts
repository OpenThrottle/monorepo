/**
 * @description GraphQL object type for PR time-in-state summary (GitHub stats).
 * Aggregates how long PRs stay in a given state (open, closed, merged).
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PrTimeInStateSummaryObject {
  @Field(() => String, {
    description: 'PR state (e.g. open, closed, merged).',
  })
  state!: string;

  @Field(() => Int, {
    description: 'Count of PRs in this state.',
  })
  count!: number;

  @Field(() => Float, {
    description: 'Average number of days PRs spent in this state.',
    nullable: true,
  })
  avgDaysInState!: number | null;
}
