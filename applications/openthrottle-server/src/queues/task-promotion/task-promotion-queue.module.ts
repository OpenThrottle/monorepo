import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerGraphqlModule } from '../../graphql/work-ledger/work-ledger-graphql.module.ts';
import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { TaskPromotionProcessor } from './task-promotion.processor.ts';
import { TaskPromotionService } from './task-promotion.service.ts';
import { TaskPromotionQueueProducerModule } from './task-promotion-queue-producer.module.ts';

/**
 * @description Processor half of the task-promotion queue: the WorkerHost that
 * promotes a task into a full plan, plus the {@link TaskPromotionService} that
 * owns the promotion transaction. Loaded only under PROCESS_ROLE worker/all
 * (gated in app.module's buildImports like the other queues). The service is
 * exported so the plan-rules `promote_task_to_plan` executor can share it.
 * WorkLedgerGraphqlModule (for WorkLedgerCaptureService) is imported for the source task's
 * status_change capture in TaskPromotionService.closeOutSourceTask.
 */
@Module({
  exports: [TaskPromotionQueueProducerModule, TaskPromotionService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    TaskPromotionQueueProducerModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [TaskPromotionProcessor, TaskPromotionService],
})
export class TaskPromotionQueueModule {}
