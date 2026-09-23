import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';

import { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
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
 *
 * Provides {@link WorkLedgerCaptureService} directly (not via WorkLedgerGraphqlModule, which is
 * API-tier only and gated behind isApiLike) so {@link PlansProcessor} can capture the plan-level
 * BLOCKED transition written when a `beforeAll` job-run hook blocks the main run. Same precedent as
 * TaskPromotionQueueModule: WorkLedgerCaptureService only depends on GlobalClsService — no
 * GraphQL/resolver baggage — matching how {@link WorkLedgerRunService} is already provided locally
 * here rather than reaching into the API-tier module.
 */
@Module({
  exports: [PlansQueueProducerModule],
  imports: [
    AgenticRalphModule,
    GlobalClsModule,
    LoggerModule,
    MetricsModule,
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
    PlanLifecycleHooksQueueProducerModule,
    PlansQueueProducerModule,
  ],
  providers: [PlansProcessor, WorkLedgerCaptureService, WorkLedgerRunService],
})
export class PlansQueueModule {}
