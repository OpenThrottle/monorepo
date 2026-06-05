/**
 * @description GraphQL result object for enqueueAgenticWorkflowMock mutation.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EnqueueAgenticWorkflowMockResultObject {
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
    description: 'BullMQ job name when success is true.',
    nullable: true,
  })
  jobName!: string | null;

  @Field(() => String, {
    description: 'BullMQ queue name when success is true.',
    nullable: true,
  })
  queueName!: string | null;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
