/**
 * @description GraphQL result object for createQueue mutation. success true with queueName, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreateQueueResultObject {
  @Field(() => Boolean, {
    description: 'Whether the queue was created (or accepted for registration).',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'Queue name when success is true.',
    nullable: true,
  })
  queueName!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
