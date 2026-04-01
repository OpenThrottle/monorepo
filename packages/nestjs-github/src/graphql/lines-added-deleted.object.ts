/**
 * @description GraphQL object type for one row of lines added/deleted aggregation (by period and author).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LinesAddedDeletedRowObject {
  @Field(() => Int, {
    description: 'Total lines added across PRs in this bucket.',
  })
  additions!: number;

  @Field(() => String, {
    description: 'GitHub author login.',
  })
  author!: string;

  @Field(() => Int, {
    description: 'Total changed files across PRs in this bucket.',
  })
  changedFiles!: number;

  @Field(() => Int, {
    description: 'Total lines deleted across PRs in this bucket.',
  })
  deletions!: number;

  @Field(() => String, {
    description: 'Period bucket (e.g. YYYY-MM or YYYY-Www in UTC).',
  })
  period!: string;

  @Field(() => Int, {
    description: 'Number of merged PRs in this bucket.',
  })
  prCount!: number;
}
