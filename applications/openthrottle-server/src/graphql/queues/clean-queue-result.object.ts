/**
 * @description GraphQL result object for cleanQueue mutation. success true with removedCount,
 * or success false with error.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CleanQueueResultObject {
  @Field(() => Boolean, {
    description: 'Whether the clean was accepted.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'Queue name when success is true.',
    nullable: true,
  })
  queueName!: string | null;

  @Field(() => Int, {
    description: 'Number of jobs removed (0 when success is false).',
  })
  removedCount!: number;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
