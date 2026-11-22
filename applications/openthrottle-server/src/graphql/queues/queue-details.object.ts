/**
 * @description GraphQL object types for queue details: QueueDetailsObject (stats + optional paginated jobs) and JobsResultObject.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

import { JobObject } from './job.object.ts';
import { QueueStatsObject } from './queue-stats.object.ts';

@ObjectType()
export class JobsResultObject extends OffsetPageObject {
  @Field(() => [JobObject], {
    description: 'Paginated list of jobs for the queue.',
  })
  items!: JobObject[];
}

@ObjectType()
export class QueueDetailsObject extends QueueStatsObject {
  @Field(() => JobsResultObject, {
    description: `Paginated jobs for this queue (optional; omit for stats-only).`,
    nullable: true,
  })
  jobs!: JobsResultObject | null;
}
