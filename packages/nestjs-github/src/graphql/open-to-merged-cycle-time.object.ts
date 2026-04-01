/**
 * @description GraphQL object type for open-to-merged cycle time (median and P90 days).
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OpenToMergedCycleTimeObject {
  @Field(() => Float, {
    description: 'Median number of days from PR open to merge.',
    nullable: true,
  })
  medianDays!: number | null;

  @Field(() => Float, {
    description: '90th percentile of days from PR open to merge.',
    nullable: true,
  })
  p90Days!: number | null;

  @Field(() => String, {
    description:
      'Period bucket (e.g. YYYY-MM or YYYY-Www in UTC), or null for repo-wide.',
    nullable: true,
  })
  period!: string | null;

  @Field(() => Int, {
    description: 'Number of merged PRs in this bucket.',
  })
  prCount!: number;
}
