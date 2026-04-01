/**
 * @description GraphQL object type for PRs merged per period (week or month).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PrsMergedPerPeriodObject {
  @Field(() => Int, {
    description: 'Number of PRs merged in this period.',
  })
  count!: number;

  @Field(() => String, {
    description: 'Period bucket in UTC (e.g. YYYY-MM or YYYY-Www).',
  })
  period!: string;
}
