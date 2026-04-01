/**
 * @description GraphQL result object for retryJob mutation. success true with jobId, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RetryJobResultObject {
  @Field(() => Boolean, {
    description: 'Whether the retry was accepted.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'Job id when success is true.',
    nullable: true,
  })
  jobId!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
