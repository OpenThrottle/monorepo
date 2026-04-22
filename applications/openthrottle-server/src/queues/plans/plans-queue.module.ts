import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsAgenticWorkflowModule } from '@openthrottle/nestjs-agentic-workflow';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import { buildWorkflowExecuteGraphqlV2Options } from '@openthrottle/openthrottle-agentic-ralph';
import { MetricsModule } from '../../metrics/metrics.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import { PlansRalphOrchestratorService } from './plans-ralph-orchestrator.service';
import { PlansProcessor } from './plans.processor';
import { resolvePlansWorkerWorkflowGraphqlConfigFromEnv } from './worker-graphql-auth';

/**
 * @description Registers the single BullMQ **queue** {@link PLANS_QUEUE_NAME} (`plans`) and the plans worker.
 * In-process Ralph orchestrator jobs share this queue with spawn jobs (see `plans.types.ts`); there is no
 * separate Ralph queue. Bull Board lists this queue via {@link NestjsBullmqBoardModule.forFeature}.
 */
@Module({
  exports: [BullModule, PlanRunCancellationService],
  imports: [
    LoggerModule,
    MetricsModule,
    NestjsAgenticWorkflowModule.register({
      executeGraphqlV2,
      workerGraphqlAuth: buildWorkflowExecuteGraphqlV2Options(
        resolvePlansWorkerWorkflowGraphqlConfigFromEnv(),
      ),
    }),
    NestjsBullmqModule.registerQueue(PLANS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLANS_QUEUE_NAME),
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
  ],
  providers: [
    PlanRunCancellationService,
    PlansProcessor,
    PlansRalphOrchestratorService,
  ],
})
export class PlansQueueModule {}
