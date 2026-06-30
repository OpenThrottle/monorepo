/**
 * @description GraphQL ObjectType for a single sanitized log line from a BullMQ
 * keyed per-job run transcript (Phase 1 log tail API, OT plan 3c397432). `message`
 * is always redaction-passed before it reaches this object (see
 * `queue-job-log-redaction`); `cursor` is the opaque forward cursor positioned
 * AFTER this event. See `docs/log-tail-api-design.md`.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { QueueJobLogLevelEnum } from './queue-job-log-level.enum';
import type { QueueJobLogLevel } from './queue-job-log-mapping';

@ObjectType()
export class QueueJobLogEventObject {
  @Field(() => String, {
    description:
      'Opaque cursor positioned AFTER this event; pass as `after` to resume.',
  })
  cursor!: string;

  @Field(() => String)
  jobId!: string;

  @Field(() => QueueJobLogLevelEnum)
  level!: QueueJobLogLevel;

  @Field(() => String)
  message!: string;

  @Field(() => String)
  queueName!: string;

  @Field(() => String, {
    description:
      'Origin layer, e.g. plans-queue | workflow-queue | ralph-shim.',
  })
  source!: string;

  @Field(() => Date)
  timestamp!: Date;
}
