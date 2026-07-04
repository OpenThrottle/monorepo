import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { CODE_INDEX_QUEUE_NAME } from './code-index.constants';

/**
 * @description Producer half of the code-index queue: registerQueue (enqueue
 * capability) + Bull Board listing, no WorkerHost. Safe under any PROCESS_ROLE;
 * the processor lives in {@link CodeIndexQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(CODE_INDEX_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(CODE_INDEX_QUEUE_NAME),
  ],
})
export class CodeIndexQueueProducerModule {}
