import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';
import { MetricsModule } from '../../metrics/metrics.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AgenticRalphModule } from '../agentic-ralph/agentic-ralph.module';
import { PlanLifecycleHooksQueueModule } from '../plan-lifecycle-hooks/plan-lifecycle-hooks-queue.module';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import { PlansProcessor } from './plans.processor';

/**
 * @description Registers the single BullMQ **queue** {@link PLANS_QUEUE_NAME} (`plans`) and the plans worker.
 * In-process Ralph orchestrator jobs share this queue with spawn jobs (see `plans.types.ts`); there is no
 * separate Ralph queue. Agentic Ralph Nest wiring (`NestjsAgenticWorkflowModule`, orchestrator service) lives in
 * {@link AgenticRalphModule}. Bull Board lists this queue via {@link NestjsBullmqBoardModule.forFeature}.
 * Optional per-job run JSONL is wired in {@link PlansProcessor} when `BULLMQ_RUN_OUTPUT_DIR` is set (`BullMqRunOutputModule` in `AppModule`).
 */
@Module({
  exports: [BullModule, PlanRunCancellationService],
  imports: [
    AgenticRalphModule,
    LoggerModule,
    MetricsModule,
    NestjsBullmqModule.registerQueue(PLANS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLANS_QUEUE_NAME),
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
    PlanLifecycleHooksQueueModule,
  ],
  providers: [PlanRunCancellationService, PlansProcessor],
})
export class PlansQueueModule {}
