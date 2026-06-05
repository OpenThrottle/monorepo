/**
 * @description GraphQL object type for a BullMQ job. Maps BullMQ Job fields for queue details and job queries.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { TaskRunMetricsObject } from '../metrics/task-run-metrics.object';

@ObjectType()
export class JobObject {
  @Field(() => String, {
    description: 'JSON string of job data (e.g. { planId } for run-plan).',
    nullable: true,
  })
  data!: string | null;

  @Field(() => String, {
    description:
      'Execution backend selected once for this plan run. Present for plans queue jobs.',
    nullable: true,
  })
  executionBackend!: string | null;

  @Field(() => String, {
    description: 'Error message if the job failed.',
    nullable: true,
  })
  failedReason!: string | null;

  @Field(() => Float, {
    description: 'Unix timestamp when the job finished.',
    nullable: true,
  })
  finishedOn!: number | null;

  @Field(() => String, {
    description: 'BullMQ job id.',
  })
  id!: string;

  @Field(() => String, {
    description:
      'Job type name (e.g. run-plan). Future workflows may add more types; the queues schema is extensible per queue.',
    nullable: true,
  })
  name!: string | null;

  @Field(() => Int, {
    description: 'Job progress (0-100 or custom).',
    nullable: true,
  })
  progress!: number | null;

  @Field(() => Float, {
    description: 'Unix timestamp when the job started processing.',
    nullable: true,
  })
  processedOn!: number | null;

  @Field(() => String, {
    description: 'Return value from the processor (if completed).',
    nullable: true,
  })
  returnvalue!: string | null;

  @Field(() => String, {
    description: 'Job state: waiting, active, completed, failed, delayed.',
  })
  state!: string;

  @Field(() => TaskRunMetricsObject, {
    description:
      'Task-run metrics (process memory/CPU at start and end). Present only for plans-queue jobs that completed with metrics.',
    nullable: true,
  })
  taskRunMetrics!: TaskRunMetricsObject | null;

  @Field(() => Float, {
    description: 'Unix timestamp when the job was created.',
    nullable: true,
  })
  timestamp!: number | null;
}
