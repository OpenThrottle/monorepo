/**
 * @description GraphQL object types for queue details: QueueDetailsObject (stats + optional paginated jobs) and JobsResultObject.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JobObject } from './job.object';
import { QueueStatsObject } from './queue-stats.object';

@ObjectType()
export class JobsResultObject {
  @Field(() => [JobObject], {
    description: 'Paginated list of jobs for the queue.',
  })
  jobs!: JobObject[];

  @Field(() => Boolean, {
    description: 'Whether more jobs exist after this page.',
  })
  hasNext!: boolean;

  @Field(() => Int, {
    description:
      'Total jobs across the requested states (state-filtered), for accurate pagination.',
  })
  total!: number;
}

@ObjectType()
export class QueueDetailsObject extends QueueStatsObject {
  @Field(() => JobsResultObject, {
    description:
      'Paginated jobs for this queue (optional; omit for stats-only).',
    nullable: true,
  })
  jobs!: JobsResultObject | null;
}
