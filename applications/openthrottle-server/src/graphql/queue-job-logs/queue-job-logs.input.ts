/**
 * @description GraphQL input for the `queueJobLogs` historical/catch-up query
 * (Phase 1 log tail API, OT plan 3c397432). `since` and `after` are mutually
 * exclusive (validated in the resolver/service). See `docs/log-tail-api-design.md`.
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { QueueJobLogLevelEnum } from './queue-job-log-level.enum';
import type { QueueJobLogLevel } from './queue-job-log-mapping';

@InputType()
export class QueueJobLogsInput {
  @Field(() => String, {
    description:
      'Opaque cursor from a prior page. Mutually exclusive with `since`.',
    nullable: true,
  })
  after!: string | null;

  @Field(() => String)
  jobId!: string;

  @Field(() => [QueueJobLogLevelEnum], {
    description: 'Optional severity filter; empty/omitted = all levels.',
    nullable: true,
  })
  levelIn!: QueueJobLogLevel[] | null;

  @Field(() => Int, {
    description: 'Max events; server-capped (default 200, hard max 1000).',
    nullable: true,
  })
  limit!: number | null;

  @Field(() => String)
  queueName!: string;

  @Field(() => Date, {
    description:
      'ISO-8601 lower bound (inclusive). Mutually exclusive with `after`.',
    nullable: true,
  })
  since!: Date | null;
}
