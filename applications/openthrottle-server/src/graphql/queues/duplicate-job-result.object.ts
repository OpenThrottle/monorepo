/**
 * @description GraphQL result object for duplicateJob mutation. success true with jobId, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DuplicateJobResultObject {
  @Field(() => Boolean, {
    description: 'Whether the duplicate was accepted.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'New job id when success is true.',
    nullable: true,
  })
  jobId!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
