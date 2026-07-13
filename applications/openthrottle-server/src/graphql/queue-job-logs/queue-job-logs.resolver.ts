/**
 * @description Resolver for the Phase 1 log tail API (OT plan 3c397432). Exposes:
 * - `queueJobLogs`: a historical / catch-up read of a job's keyed BullMQ run
 *   transcript, paged by opaque cursor. Mirrors the `planOutputStreamChunks` query
 *   precedent.
 * - `queueJobLogTail`: a live tail of new keyed run-output lines for a
 *   `(queueName, jobId)`, mirroring the `planOutputChunkAdded` subscription. Events
 *   are published by the `KeyedJsonlWriter.onAppend` hook (see
 *   `queue-job-log-publisher`) on the `bullmq:<queue>:<jobId>:logs` topic.
 *
 * Auth (task 4): the query is covered by the global `GlobalAuthGuard`
 * (service-account bearer + JWT) — intentionally NOT `@Public()`, so anonymous
 * access is rejected. The subscription is `@Public()` at the HTTP-guard layer
 * because graphql-ws authenticates at the connection handshake (`onConnect`); this
 * resolver re-checks `context.userId` and rejects when absent, identical to
 * `planOutputChunkAdded`.
 *
 * Rate limiting (task 5): `queueJobLogs` carries a strict per-subject `@Throttle`
 * (30 req / 60s) — well under the 1000/60s global default — and its `limit` is
 * hard-capped server-side (1000). The subscription's per-subject connection cap is
 * a graphql-ws `onConnect` (transport) concern, documented as policy in
 * `docs/log-tail-api-design.md`, not a resolver decorator (the throttler guard does
 * not run on the ws connection).
 */

import { Throttle } from '@nestjs/throttler';
import { ForbiddenException, Inject } from '@nestjs/common';
import { Args, Context, Query, Resolver, Subscription } from '@nestjs/graphql';
import {
  PUB_SUB,
  queueJobLogTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { QueueJobLogEventObject } from './queue-job-log-event.object';
import { QueueJobLogPageObject } from './queue-job-log-page.object';
import { QueueJobLogsInput } from './queue-job-logs.input';
import { QueueJobLogsService } from './queue-job-logs.service';

/** Strict per-subject limit for the catch-up query (global default is 1000/60s). */
const QUEUE_JOB_LOGS_THROTTLE = {
  default: { limit: 30, ttl: 60_000 },
} as const;

@Resolver(() => QueueJobLogEventObject)
export class QueueJobLogsResolver {
  constructor(
    private readonly queueJobLogsService: QueueJobLogsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSubEngine,
  ) {}

  @Throttle(QUEUE_JOB_LOGS_THROTTLE)
  @Query(() => QueueJobLogPageObject, {
    description: `Historical / catch-up read of a job's keyed BullMQ run transcript, paged by opaque cursor.`,
  })
  async queueJobLogs(
    @Args('input', { type: () => QueueJobLogsInput })
    input: QueueJobLogsInput,
  ): Promise<QueueJobLogPageObject> {
    return this.queueJobLogsService.read(input);
  }

  // 🔌 graphql-ws only: connection auth (onConnect) already validated the token
  // and stashed userId on the context, so skip the HTTP-shaped global auth guard
  // (which requires `req`) and authorize from the connection identity here.
  @Public()
  @Subscription(() => QueueJobLogEventObject, {
    description: `Live tail of new keyed run-output lines for a (queueName, jobId) — topic bullmq:<queueName>:<jobId>:logs.`,
  })
  queueJobLogTail(
    @Args('queueName', { type: () => String }) queueName: string,
    @Args('jobId', { type: () => String }) jobId: string,
    @Context() context: { userId?: string },
  ): AsyncIterator<QueueJobLogEventObject> {
    // Identity comes from the authenticated ws connection, never a variable.
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }

    return this.pubSub.asyncIterator<QueueJobLogEventObject>(
      queueJobLogTopic(queueName, jobId),
    );
  }
}
