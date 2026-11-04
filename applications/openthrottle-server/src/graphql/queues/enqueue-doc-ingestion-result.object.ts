/**
 * @description Deprecated: GraphQL result object for the deprecated
 * enqueueDocIngestion mutation. Doc ingestion has been removed, so it is always
 * `success: false` with an error; the type stays only for schema compatibility
 * until the mutation is removed.
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
