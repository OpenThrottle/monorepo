/**
 * @description GraphQL result object for reversible queue controls (pauseQueue / resumeQueue).
 * success true with queueName, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class QueueControlResultObject {
  @Field(() => Boolean, {
    description: 'Whether the control action was accepted.',
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
