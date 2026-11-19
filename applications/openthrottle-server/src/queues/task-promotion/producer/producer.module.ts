import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  TasksModule,
  TaskTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { TaskPromotionEnqueueService } from '../enqueue/enqueue.service.ts';
import { TASK_PROMOTION_QUEUE_NAME } from '../task-promotion.constants.ts';

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
    NestjsBullmqBoardModule.forFeature(TASK_PROMOTION_QUEUE_NAME),
    NestjsBullmqModule.registerQueue(TASK_PROMOTION_QUEUE_NAME),
    TasksModule,
    TaskTagsModule,
  ],
  providers: [TaskPromotionEnqueueService],
})
export class TaskPromotionQueueProducerModule {}
