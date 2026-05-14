/**
 * @description GraphQL object for one plan run in recentPlanRunsMetrics: job id, finished time, and task-run metrics.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';
import { TaskRunMetricsObject } from './task-run-metrics.object';

@ObjectType('PlanRunMetricsEntry', {
  description:
    'A single plan run with metrics: job id, finished timestamp, and task-run metrics (memory/CPU at start and end).',
})
export class PlanRunMetricsEntryObject {
  @Field(() => String, {
    description: 'BullMQ job id for this run.',
  })
  jobId!: string;

  @Field(() => Float, {
    description: 'Unix timestamp when the job finished.',
    nullable: true,
  })
  finishedOn!: number | null;

  @Field(() => String, {
    description:
      'Execution backend selected once for the whole run: cursor or claude.',
    nullable: true,
  })
  executionBackend!: string | null;

  @Field(() => TaskRunMetricsObject, {
    description:
      'Task-run metrics (process memory/CPU at start and end). Null if job completed without metrics.',
    nullable: true,
  })
  taskRunMetrics!: TaskRunMetricsObject | null;
}
