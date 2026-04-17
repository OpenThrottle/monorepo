import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';
import { MetricsModule } from '../../metrics/metrics.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { WORKFLOW_NAME } from './workflow.constants';
import { WorkflowService } from './workflow.service';
import { WorkflowProcessor } from './workflow.processor';

/**
 * @description Registers the single BullMQ **queue** {@link PLANS_QUEUE_NAME} (`plans`) and the plans worker.
 * In-process Ralph orchestrator jobs share this queue with spawn jobs (see `plans.types.ts`); there is no
 * separate Ralph queue. Bull Board lists this queue via {@link NestjsBullmqBoardModule.forFeature}.
 */
@Module({
  exports: [BullModule, WorkflowService],
  imports: [
    LoggerModule,
    MetricsModule,
    NestjsBullmqModule.registerQueue(WORKFLOW_NAME),
    NestjsBullmqBoardModule.forFeature(WORKFLOW_NAME),
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
  ],
  providers: [WorkflowService, WorkflowProcessor],
})
export class WorkflowModule {}
