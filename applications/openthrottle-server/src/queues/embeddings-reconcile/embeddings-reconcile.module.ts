import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbeddingsQueueProducerModule } from '../embeddings/producer/producer.module.ts';
import { EmbeddingsReconcileProcessor } from './embeddings-reconcile.processor.ts';
import { EmbeddingsReconcileQueueProducerModule } from './producer/producer.module.ts';
import { EmbeddingsReconcileRepeatableService } from './repeatable/repeatable.service.ts';

/**
 * @description Processor half of the embeddings reconciler (WorkerHost + repeatable). Loaded
 * only under PROCESS_ROLE worker/all, beside the embeddings queue processor it feeds.
 */
@Module({
  imports: [
    EmbedderModule,
    EmbeddingsQueueProducerModule,
    EmbeddingsReconcileQueueProducerModule,
    LoggerModule,
  ],
  providers: [
    EmbeddingsReconcileProcessor,
    EmbeddingsReconcileRepeatableService,
  ],
})
export class EmbeddingsReconcileQueueModule {}
