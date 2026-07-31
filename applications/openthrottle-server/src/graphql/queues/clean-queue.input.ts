/**
 * @description GraphQL input for cleanQueue mutation: queue name, which finished state to remove
 * (completed or failed only), a required confirmation flag for the destructive action, and optional
 * age/limit bounds.
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CleanQueueInput {
  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;

  @Field(() => String, {
    description: 'Which finished jobs to remove: "completed" or "failed" only.',
  })
  state!: string;

  @Field(() => Boolean, {
    description: 'Must be true to confirm this destructive action.',
  })
  confirm!: boolean;

  @Field(() => Int, {
    description:
      'Only remove jobs finished at least this many milliseconds ago (0 = any age).',
    nullable: true,
  })
  graceMs?: number;

  @Field(() => Int, {
    description: 'Maximum number of jobs to remove (0 = no limit).',
    nullable: true,
  })
  limit?: number;
}
