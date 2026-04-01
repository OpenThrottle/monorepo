/**
 * @description GraphQL object type for one row of commits-per-PR (PR size in commits).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommitsPerPrRowObject {
  @Field(() => Int, {
    description: `Number of commits in the PR.`,
  })
  commits!: number;

  @Field(() => String, {
    description: `ISO 8601 merged_at; null if not merged.`,
    nullable: true,
  })
  mergedAt!: string | null;

  @Field(() => String, {
    description: `Period bucket (e.g. YYYY-MM or YYYY-Www in UTC); null if no period requested.`,
    nullable: true,
  })
  period!: string | null;

  @Field(() => Int, {
    description: `Pull request number.`,
  })
  prNumber!: number;
}
