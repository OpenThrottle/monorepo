/**
 * @description GraphQL object type for BullMQ queue statistics (job counts per state).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QueueStatsObject {
  @Field(() => String, {
    description: 'Queue name (e.g. plans).',
  })
  name!: string;

  @Field(() => Int, {
    description: 'Number of jobs waiting to be processed.',
  })
  waitingCount!: number;

  @Field(() => Int, {
    description: 'Number of jobs currently being processed.',
  })
  activeCount!: number;

  @Field(() => Int, {
    description: 'Number of completed jobs.',
  })
  completedCount!: number;

  @Field(() => Int, {
    description: 'Number of failed jobs.',
  })
  failedCount!: number;

  @Field(() => Int, {
    description: 'Number of delayed jobs.',
  })
  delayedCount!: number;
}
