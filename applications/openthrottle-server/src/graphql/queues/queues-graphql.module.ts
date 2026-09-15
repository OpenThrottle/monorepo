/**
 * @description GraphQL module for queues query. Imports queue PRODUCER modules
 * for BullMQ queue injection (enqueue + stats only — processors are role-gated
 * in the app module) and provides QueuesService and QueuesResolver.
 */

import { Module } from '@nestjs/common';

import { AgenticTestQueueProducerModule } from '../../queues/agentic-test/agentic-test-queue-producer.module.ts';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/code-index-queue-producer.module.ts';
import { DailyStatsQueueProducerModule } from '../../queues/daily-stats/daily-stats-queue-producer.module.ts';
import { DataRetentionQueueProducerModule } from '../../queues/data-retention/data-retention-queue-producer.module.ts';
import { DatabaseBackupQueueProducerModule } from '../../queues/database-backup/database-backup-queue-producer.module.ts';
import { DocIngestionQueueProducerModule } from '../../queues/doc-ingestion/doc-ingestion-queue-producer.module.ts';
import { PlanLifecycleHooksQueueProducerModule } from '../../queues/plan-lifecycle-hooks/plan-lifecycle-hooks-queue-producer.module.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module.ts';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module.ts';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module.ts';
import { WorkLedgerSweepQueueProducerModule } from '../../queues/work-ledger-sweep/work-ledger-sweep-queue-producer.module.ts';
import { WorkLedgerVerifyQueueProducerModule } from '../../queues/work-ledger-verify/work-ledger-verify-queue-producer.module.ts';
import { QueuesResolver } from './queues.resolver.ts';
import { QueuesService } from './queues.service.ts';

@Module({
  exports: [QueuesService],
  imports: [
    AgenticTestQueueProducerModule,
    CodeIndexQueueProducerModule,
    DailyStatsQueueProducerModule,
    DatabaseBackupQueueProducerModule,
    DataRetentionQueueProducerModule,
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
