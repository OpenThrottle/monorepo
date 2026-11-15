import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';

import { EMBEDDINGS_RECONCILE_QUEUE_NAME } from '../embeddings-reconcile.constants.ts';

/**
 * @description Producer half of the embeddings-reconcile queue: registerQueue + Bull Board
 * listing, no WorkerHost. The processor and the repeatable live in EmbeddingsReconcileQueueModule.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(EMBEDDINGS_RECONCILE_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(EMBEDDINGS_RECONCILE_QUEUE_NAME),
  ],
})
export class EmbeddingsReconcileQueueProducerModule {}
