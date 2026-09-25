import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';

import { PlanStatusModule } from '../../graphql/plans/plan-status.module.ts';
import { WorkLedgerGraphqlModule } from '../../graphql/work-ledger/work-ledger-graphql.module.ts';
import { MetricsModule } from '../../metrics/metrics.module.ts';
import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { AgenticRalphModule } from '../agentic-ralph/agentic-ralph.module.ts';
import { PlanLifecycleHooksQueueProducerModule } from '../plan-lifecycle-hooks/plan-lifecycle-hooks-queue-producer.module.ts';
import { PlansProcessor } from './plans.processor.ts';
import { PlansQueueProducerModule } from './plans-queue-producer.module.ts';
import { WorkLedgerRunService } from './work-ledger-run.service.ts';

/**
 * @description Processor half of the plans queue: the plans worker
 * ({@link PlansProcessor}). Loaded only under PROCESS_ROLE worker/all;
 * enqueue-only consumers (GraphQL mutations, health checks) import
 * {@link PlansQueueProducerModule} instead. In-process Ralph orchestrator jobs
 * share this queue with spawn jobs (see `plans.types.ts`); there is no separate
 * Ralph queue. Agentic Ralph Nest wiring (`NestjsAgenticWorkflowModule`,
 * orchestrator service) lives in {@link AgenticRalphModule}. The lifecycle-hook
 * dispatcher comes from {@link PlanLifecycleHooksQueueProducerModule}; its
 * processor is registered separately at the app level under worker/all.
 * Optional per-job run JSONL is wired in {@link PlansProcessor} when
 * `BULLMQ_RUN_OUTPUT_DIR` is set (`BullMqRunOutputModule` in the app module).
 * PlanStatusModule (the plans.status write chokepoint) and WorkLedgerGraphqlModule (for the
 * `status-change-system` service-account lookup the worker attributes its writes to) are imported
 * for the worker's own plan status writes (job start, startup reconcile).
 */
@Module({
  exports: [PlansQueueProducerModule],
  imports: [
    AgenticRalphModule,
    LoggerModule,
    MetricsModule,
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
    PlanLifecycleHooksQueueProducerModule,
    PlanStatusModule,
    PlansQueueProducerModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [PlansProcessor, WorkLedgerRunService],
})
export class PlansQueueModule {}
