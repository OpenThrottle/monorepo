/**
 * @description GraphQL object type for open PR count per author (GitHub stats).
 * Mirrors the queues pattern (e.g. QueueStatsObject).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OpenPrCountByAuthorObject {
  @Field(() => String, {
    description: 'GitHub author login.',
  })
  author!: string;

  @Field(() => Int, {
    description: 'Number of open PRs by this author for the repo.',
  })
  openCount!: number;
}
