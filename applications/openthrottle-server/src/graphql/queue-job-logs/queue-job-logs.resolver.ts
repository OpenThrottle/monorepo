/**
 * @description Resolver for the Phase 1 log tail API (OT plan 3c397432). Exposes
 * `queueJobLogs`: a historical / catch-up read of a job's keyed BullMQ run
 * transcript, paged by opaque cursor. Mirrors the `planOutputStreamChunks` query
 * precedent. Auth: covered by the global `GlobalAuthGuard` (service-account bearer
 * + JWT) — intentionally NOT `@Public()`, so anonymous access is rejected (task 4).
 * The live-tail subscription (`queueJobLogTail`) is the remaining task-3 piece and
 * lands with the processor-side publish wiring.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';
import { QueueJobLogEventObject } from './queue-job-log-event.object';
import { QueueJobLogPageObject } from './queue-job-log-page.object';
import { QueueJobLogsInput } from './queue-job-logs.input';
import { QueueJobLogsService } from './queue-job-logs.service';

@Resolver(() => QueueJobLogEventObject)
export class QueueJobLogsResolver {
  constructor(private readonly queueJobLogsService: QueueJobLogsService) {}

  @Query(() => QueueJobLogPageObject, {
    description: `Historical / catch-up read of a job's keyed BullMQ run transcript, paged by opaque cursor.`,
  })
  async queueJobLogs(
    @Args('input', { type: () => QueueJobLogsInput })
    input: QueueJobLogsInput,
  ): Promise<QueueJobLogPageObject> {
    return this.queueJobLogsService.read(input);
  }
}
