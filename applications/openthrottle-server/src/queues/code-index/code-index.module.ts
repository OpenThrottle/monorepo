import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';

import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { CodeIndexProcessor } from './code-index.processor.ts';
import { CodeIndexQueueProducerModule } from './producer/producer.module.ts';

/**
 * @description Processor half of the code-index queue (WorkerHost). Loaded only
 * under PROCESS_ROLE worker/all; enqueue-only consumers import
 * {@link CodeIndexQueueProducerModule} instead. Imports NestjsVectorSearchModule
 * (CodeSearchService, embedding through the server's single EmbedderService) and NestjsRepositoriesModule
 * (WorkspaceLocalRepositoriesService) so the processor can resolve a
 * repository's filesystem path and run the engine index.
 */
@Module({
  exports: [CodeIndexQueueProducerModule],
  imports: [
    CodeIndexQueueProducerModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule.register({
      embedder: EmbedderService,
      imports: [EmbedderModule],
    }),
  ],
  providers: [CodeIndexProcessor],
})
export class CodeIndexQueueModule {}
