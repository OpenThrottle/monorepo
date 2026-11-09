/**
 * @description The queue-producer half of {@link QueuesGraphqlModule}: imports every queue
 * PRODUCER module for BullMQ injection and provides QueuesService, with no resolver. Code that
 * only needs to enqueue (e.g. PlanEnqueueModule, which the plans worker imports) depends on this
 * module rather than the GraphQL one, so loading it never registers the queues resolver early and
 * reorders the generated schema.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { AgenticTestQueueProducerModule } from '../../../queues/agentic-test/producer/producer.module.ts';
import { CodeIndexQueueProducerModule } from '../../../queues/code-index/producer/producer.module.ts';
import { DailyStatsQueueProducerModule } from '../../../queues/daily-stats/producer/producer.module.ts';
import { DataRetentionQueueProducerModule } from '../../../queues/data-retention/producer/producer.module.ts';
import { DatabaseBackupQueueProducerModule } from '../../../queues/database-backup/producer/producer.module.ts';
import { PlanLifecycleHooksQueueProducerModule } from '../../../queues/plan-lifecycle-hooks/producer/producer.module.ts';
import { PlanRulesQueueProducerModule } from '../../../queues/plan-rules/producer/producer.module.ts';
import { PlansQueueProducerModule } from '../../../queues/plans/producer/producer.module.ts';
import { TaggingQueueProducerModule } from '../../../queues/tagging/producer/producer.module.ts';
import { WorkLedgerSweepQueueProducerModule } from '../../../queues/work-ledger-sweep/producer/producer.module.ts';
import { WorkLedgerVerifyQueueProducerModule } from '../../../queues/work-ledger-verify/producer/producer.module.ts';
import { QueuesService } from './queues-service.service.ts';

@Module({
  exports: [QueuesService],
  imports: [
    AgenticTestQueueProducerModule,
    CodeIndexQueueProducerModule,
    DailyStatsQueueProducerModule,
    DatabaseBackupQueueProducerModule,
    DataRetentionQueueProducerModule,
    LoggerModule,
    PlanLifecycleHooksQueueProducerModule,
    PlanRulesQueueProducerModule,
    PlansQueueProducerModule,
    TaggingQueueProducerModule,
    WorkLedgerSweepQueueProducerModule,
    WorkLedgerVerifyQueueProducerModule,
  ],
  providers: [QueuesService],
})
export class QueuesServiceModule {}
