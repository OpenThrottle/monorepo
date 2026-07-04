/**
 * @description GraphQL module for queues query. Imports queue PRODUCER modules
 * for BullMQ queue injection (enqueue + stats only — processors are role-gated
 * in the app module) and provides QueuesService and QueuesResolver.
 */

import { Module } from '@nestjs/common';
import { AgenticTestQueueProducerModule } from '../../queues/agentic-test/agentic-test-queue-producer.module';
import { DailyStatsQueueProducerModule } from '../../queues/daily-stats/daily-stats-queue-producer.module';
import { DatabaseBackupQueueProducerModule } from '../../queues/database-backup/database-backup-queue-producer.module';
import { DocIngestionQueueProducerModule } from '../../queues/doc-ingestion/doc-ingestion-queue-producer.module';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module';
import { QueuesResolver } from './queues.resolver';
import { QueuesService } from './queues.service';

@Module({
  exports: [QueuesService],
  imports: [
    AgenticTestQueueProducerModule,
    DailyStatsQueueProducerModule,
    DatabaseBackupQueueProducerModule,
    DocIngestionQueueProducerModule,
    PlansQueueProducerModule,
  ],
  providers: [QueuesResolver, QueuesService],
})
export class QueuesGraphqlModule {}
