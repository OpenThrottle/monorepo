/**
 * @description GraphQL module registering the Phase 1 log tail query resolver and
 * its service (OT plan 3c397432). The service reads keyed BullMQ run transcripts
 * off disk via the `@openthrottle/nestjs-logging` storage adapter — no repository
 * or queue imports are needed for the read path.
 */

import { Module } from '@nestjs/common';
import { QueueJobLogsResolver } from './queue-job-logs.resolver';
import { QueueJobLogsService } from './queue-job-logs.service';

@Module({
  providers: [QueueJobLogsResolver, QueueJobLogsService],
})
export class QueueJobLogsGraphqlModule {}
