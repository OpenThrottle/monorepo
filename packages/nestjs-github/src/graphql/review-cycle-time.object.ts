/**
 * @description GraphQL object type for review cycle time (median and P90 days from last CHANGES_REQUESTED to first subsequent APPROVED or merge).
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReviewCycleTimeObject {
  @Field(() => Float, {
    description:
      'Median number of days from last changes requested to first subsequent approval or merge.',
    nullable: true,
  })
  medianDays!: number | null;

  @Field(() => Float, {
    description:
      '90th percentile of days from last changes requested to first subsequent approval or merge.',
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
    description:
      'Number of merged PRs in this bucket that had at least one CHANGES_REQUESTED and then an APPROVED or merge.',
  })
  prCount!: number;
}
