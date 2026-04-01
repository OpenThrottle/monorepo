/**
 * @description GraphQL result object for enqueueDocIngestion mutation. success true with jobId, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EnqueueDocIngestionResultObject {
  @Field(() => Boolean, {
    description: 'Whether the job was enqueued.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'BullMQ job id when success is true.',
    nullable: true,
  })
  jobId!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
