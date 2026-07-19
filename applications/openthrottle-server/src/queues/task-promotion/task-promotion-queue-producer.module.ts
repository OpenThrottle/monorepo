import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { TASK_PROMOTION_QUEUE_NAME } from './task-promotion.constants';
import { TaskPromotionEnqueueService } from './task-promotion-enqueue.service';

/**
 * @description Producer half of the task-promotion queue: registerQueue, Bull
 * Board listing, and {@link TaskPromotionEnqueueService} (validate-and-enqueue
 * from the promoteTaskToPlan mutation). Safe under any PROCESS_ROLE; the
 * processor lives in TaskPromotionQueueModule.
 */
@Module({
  exports: [BullModule, TaskPromotionEnqueueService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(TASK_PROMOTION_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(TASK_PROMOTION_QUEUE_NAME),
    NestjsRepositoriesModule,
  ],
  providers: [TaskPromotionEnqueueService],
})
export class TaskPromotionQueueProducerModule {}
