/**
 * @description GraphQL result object for enqueueAgenticTest mutation.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EnqueueAgenticTestResultObject {
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
