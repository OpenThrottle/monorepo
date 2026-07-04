import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';
import { CodeIndexQueueProducerModule } from './code-index-queue-producer.module';
import { CodeIndexProcessor } from './code-index.processor';

/**
 * @description Processor half of the code-index queue (WorkerHost). Loaded only
 * under PROCESS_ROLE worker/all; enqueue-only consumers import
 * {@link CodeIndexQueueProducerModule} instead. Imports NestjsVectorSearchModule
 * (CodeSearchService) and NestjsRepositoriesModule
 * (WorkspaceLocalRepositoriesService) so the processor can resolve a
 * repository's filesystem path and run the engine index.
 */
@Module({
  exports: [CodeIndexQueueProducerModule],
  imports: [
    CodeIndexQueueProducerModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule,
  ],
  providers: [CodeIndexProcessor],
})
export class CodeIndexQueueModule {}
