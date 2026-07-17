/**
 * @description GraphQL module for queues query. Imports queue PRODUCER modules
 * for BullMQ queue injection (enqueue + stats only — processors are role-gated
 * in the app module) and provides QueuesService and QueuesResolver.
 */

import { Module } from '@nestjs/common';
import { AgenticTestQueueProducerModule } from '../../queues/agentic-test/agentic-test-queue-producer.module';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/code-index-queue-producer.module';
import { DailyStatsQueueProducerModule } from '../../queues/daily-stats/daily-stats-queue-producer.module';
import { DatabaseBackupQueueProducerModule } from '../../queues/database-backup/database-backup-queue-producer.module';
import { DocIngestionQueueProducerModule } from '../../queues/doc-ingestion/doc-ingestion-queue-producer.module';
import { PlanLifecycleHooksQueueProducerModule } from '../../queues/plan-lifecycle-hooks/plan-lifecycle-hooks-queue-producer.module';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module';
import { WorkLedgerSweepQueueProducerModule } from '../../queues/work-ledger-sweep/work-ledger-sweep-queue-producer.module';
import { WorkLedgerVerifyQueueProducerModule } from '../../queues/work-ledger-verify/work-ledger-verify-queue-producer.module';
import { QueuesResolver } from './queues.resolver';
import { QueuesService } from './queues.service';

@Module({
  exports: [QueuesService],
  imports: [
    AgenticTestQueueProducerModule,
    CodeIndexQueueProducerModule,
    DailyStatsQueueProducerModule,
    DatabaseBackupQueueProducerModule,
    DocIngestionQueueProducerModule,
    PlanLifecycleHooksQueueProducerModule,
    PlanRulesQueueProducerModule,
    PlansQueueProducerModule,
    TaggingQueueProducerModule,
    WorkLedgerSweepQueueProducerModule,
    WorkLedgerVerifyQueueProducerModule,
  ],
  providers: [QueuesResolver, QueuesService],
})
export class QueuesGraphqlModule {}
