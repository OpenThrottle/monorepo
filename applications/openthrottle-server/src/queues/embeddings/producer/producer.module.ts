import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EMBEDDINGS_QUEUE_NAME } from '../embeddings.constants.ts';
import { EmbeddingsProducerService } from './producer.service.ts';

/**
 * @description Producer half of the embeddings queue: registerQueue, Bull Board listing and
 * {@link EmbeddingsProducerService}. Safe under any PROCESS_ROLE; the processor lives in
 * EmbeddingsQueueModule.
 */
@Module({
  exports: [BullModule, EmbeddingsProducerService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(EMBEDDINGS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(EMBEDDINGS_QUEUE_NAME),
  ],
  providers: [EmbeddingsProducerService],
})
export class EmbeddingsQueueProducerModule {}
