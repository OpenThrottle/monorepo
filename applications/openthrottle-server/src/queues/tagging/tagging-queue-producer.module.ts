import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { TAGGING_QUEUE_NAME } from './tagging.constants';
import { TaggingEnqueueService } from './tagging-enqueue.service';

/**
 * @description Producer half of the tagging queue: registerQueue, Bull Board
 * listing, and {@link TaggingEnqueueService} (fire-and-forget after-commit
 * enqueue from create/link mutation paths). Safe under any PROCESS_ROLE; the
 * processor lives in TaggingQueueModule.
 */
@Module({
  exports: [BullModule, TaggingEnqueueService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(TAGGING_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(TAGGING_QUEUE_NAME),
  ],
  providers: [TaggingEnqueueService],
})
export class TaggingQueueProducerModule {}
