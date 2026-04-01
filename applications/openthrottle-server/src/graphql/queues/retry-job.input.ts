/**
 * @description GraphQL input for retryJob mutation: job id and queue name.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RetryJobInput {
  @Field(() => ID, { description: 'BullMQ job id to retry.' })
  jobId!: string;

  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;
}
