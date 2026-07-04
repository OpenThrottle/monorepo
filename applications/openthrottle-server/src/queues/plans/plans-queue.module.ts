import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';
import { MetricsModule } from '../../metrics/metrics.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AgenticRalphModule } from '../agentic-ralph/agentic-ralph.module';
import { PlanLifecycleHooksQueueProducerModule } from '../plan-lifecycle-hooks/plan-lifecycle-hooks-queue-producer.module';
import { PlansQueueProducerModule } from './plans-queue-producer.module';
import { PlansProcessor } from './plans.processor';

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
    PlansQueueProducerModule,
  ],
  providers: [PlansProcessor],
})
export class PlansQueueModule {}
