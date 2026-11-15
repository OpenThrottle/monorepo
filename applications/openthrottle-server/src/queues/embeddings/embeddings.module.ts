import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { BackgroundActivityRegistryModule } from '../../services/background-activity-registry/background-activity-registry.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbeddingsProcessor } from './embeddings.processor.ts';
import { EmbeddingsQueueProducerModule } from './producer/producer.module.ts';

/**
 * @description Processor half of the embeddings queue (WorkerHost). Loaded only under
 * PROCESS_ROLE worker/all; enqueue-only consumers import {@link EmbeddingsQueueProducerModule}.
 */
@Module({
  exports: [EmbeddingsQueueProducerModule],
  imports: [
    BackgroundActivityRegistryModule,
    EmbedderModule,
    EmbeddingsQueueProducerModule,
    LoggerModule,
  ],
  providers: [EmbeddingsProcessor],
})
export class EmbeddingsQueueModule {}
