/**
 * @description GraphQL ObjectType for a page of keyed run-output log events
 * (Phase 1 log tail API, OT plan 3c397432). `nextCursor` is null once the read is
 * caught up to end-of-file. See `docs/log-tail-api-design.md`.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { QueueJobLogEventObject } from './queue-job-log-event.object';

@ObjectType()
export class QueueJobLogPageObject {
  @Field(() => [QueueJobLogEventObject])
  events!: QueueJobLogEventObject[];

  @Field(() => Boolean)
  hasMore!: boolean;

  @Field(() => String, {
    description:
      'Opaque cursor for the next page; null when caught up to end-of-file.',
    nullable: true,
  })
  nextCursor!: string | null;
}
