/**
 * @description The queue-producer half of {@link QueuesGraphqlModule}: imports the PRODUCER module
 * of every queue in SERVER_QUEUE_NAMES (`queues/queues.constants.ts`), so QueuesService can resolve
 * each one, and provides QueuesService, with no resolver. Code that only needs to enqueue
 * (e.g. PlanEnqueueModule, which the plans worker imports) depends on this module rather than the
 * GraphQL one, so loading it never registers the queues resolver early and reorders the generated
 * schema.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { AgenticTestQueueProducerModule } from '../../../queues/agentic-test/producer/producer.module.ts';
import { AttachmentsJanitorQueueProducerModule } from '../../../queues/attachments-janitor/producer/producer.module.ts';
import { CodeIndexQueueProducerModule } from '../../../queues/code-index/producer/producer.module.ts';
import { DailyStatsQueueProducerModule } from '../../../queues/daily-stats/producer/producer.module.ts';
import { DataRetentionQueueProducerModule } from '../../../queues/data-retention/producer/producer.module.ts';
import { DatabaseBackupQueueProducerModule } from '../../../queues/database-backup/producer/producer.module.ts';
import { EmbeddingsQueueProducerModule } from '../../../queues/embeddings/producer/producer.module.ts';
import { EmbeddingsReconcileQueueProducerModule } from '../../../queues/embeddings-reconcile/producer/producer.module.ts';
import { PlanLifecycleHooksQueueProducerModule } from '../../../queues/plan-lifecycle-hooks/producer/producer.module.ts';
import { PlanRulesQueueProducerModule } from '../../../queues/plan-rules/producer/producer.module.ts';
import { PlanRunWorktreeReaperQueueProducerModule } from '../../../queues/plan-run-worktree-reaper/producer/producer.module.ts';
import { PlanRunsStaleSweepQueueProducerModule } from '../../../queues/plan-runs-stale-sweep/producer/producer.module.ts';
import { PlansQueueProducerModule } from '../../../queues/plans/producer/producer.module.ts';
import { ScheduledAgentJobsQueueProducerModule } from '../../../queues/scheduled-agent-jobs/producer/producer.module.ts';
import { TaggingQueueProducerModule } from '../../../queues/tagging/producer/producer.module.ts';
import { TaskPromotionQueueProducerModule } from '../../../queues/task-promotion/producer/producer.module.ts';
import { WorkLedgerHarvestQueueProducerModule } from '../../../queues/work-ledger-harvest/producer/producer.module.ts';
import { WorkLedgerSweepQueueProducerModule } from '../../../queues/work-ledger-sweep/producer/producer.module.ts';
import { WorkLedgerVerifyQueueProducerModule } from '../../../queues/work-ledger-verify/producer/producer.module.ts';
import { QueuesService } from './queues-service.service.ts';

@Module({
  exports: [QueuesService],
  imports: [
    AgenticTestQueueProducerModule,
    AttachmentsJanitorQueueProducerModule,
    CodeIndexQueueProducerModule,
    DailyStatsQueueProducerModule,
    DatabaseBackupQueueProducerModule,
    DataRetentionQueueProducerModule,
    EmbeddingsQueueProducerModule,
    EmbeddingsReconcileQueueProducerModule,
    LoggerModule,
    PlanLifecycleHooksQueueProducerModule,
    PlanRulesQueueProducerModule,
    PlanRunsStaleSweepQueueProducerModule,
    PlanRunWorktreeReaperQueueProducerModule,
    PlansQueueProducerModule,
    ScheduledAgentJobsQueueProducerModule,
    TaggingQueueProducerModule,
    TaskPromotionQueueProducerModule,
    WorkLedgerHarvestQueueProducerModule,
    WorkLedgerSweepQueueProducerModule,
    WorkLedgerVerifyQueueProducerModule,
  ],
  providers: [QueuesService],
})
export class QueuesServiceModule {}
