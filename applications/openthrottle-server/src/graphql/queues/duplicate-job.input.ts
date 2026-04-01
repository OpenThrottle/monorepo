/**
 * @description GraphQL input for duplicateJob mutation: job id and queue name.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class DuplicateJobInput {
  @Field(() => ID, { description: 'BullMQ job id to duplicate.' })
  jobId!: string;

  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;
}
