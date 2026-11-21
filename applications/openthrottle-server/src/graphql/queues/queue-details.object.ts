/**
 * @description GraphQL object types for queue details: QueueDetailsObject (stats + optional paginated jobs) and JobsResultObject.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

import { JobObject } from './job.object.ts';
import { QueueStatsObject } from './queue-stats.object.ts';

@ObjectType()
export class JobsResultObject extends OffsetPageObject {
  @Field(() => Boolean, {
    deprecationReason: `Use hasNextPage`,
    description: 'Whether more jobs exist after this page.',
  })
  hasNext!: boolean;

  @Field(() => [JobObject], {
    description: 'Paginated list of jobs for the queue.',
  })
  items!: JobObject[];

  @Field(() => [JobObject], {
    deprecationReason: `Use items`,
    description: 'Paginated list of jobs for the queue.',
  })
  jobs!: JobObject[];

  @Field(() => Int, {
    deprecationReason: `Use totalCount`,
    description: `Total jobs across the requested states (state-filtered), for accurate pagination.`,
  })
  total!: number;
}

@ObjectType()
export class QueueDetailsObject extends QueueStatsObject {
  @Field(() => JobsResultObject, {
    description: `Paginated jobs for this queue (optional; omit for stats-only).`,
    nullable: true,
  })
  jobs!: JobsResultObject | null;
}
