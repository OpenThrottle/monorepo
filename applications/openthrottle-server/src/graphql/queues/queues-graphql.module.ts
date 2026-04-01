/**
 * @description GraphQL module for queues query. Imports queue modules for BullMQ queue injection and provides QueuesService and QueuesResolver.
 */

import { Module } from '@nestjs/common';
import { DailyStatsQueueModule } from '../../queues/daily-stats/daily-stats-queue.module';
import { DocIngestionQueueModule } from '../../queues/doc-ingestion/doc-ingestion-queue.module';
import { PlansQueueModule } from '../../queues/plans/plans-queue.module';
import { QueuesResolver } from './queues.resolver';
import { QueuesService } from './queues.service';

@Module({
  exports: [QueuesService],
  imports: [DailyStatsQueueModule, DocIngestionQueueModule, PlansQueueModule],
  providers: [QueuesResolver, QueuesService],
})
export class QueuesGraphqlModule {}
