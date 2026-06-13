import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';
import { CODE_INDEX_QUEUE_NAME } from './code-index.constants';
import { CodeIndexProcessor } from './code-index.processor';

/**
 * @description Registers the code-index BullMQ queue + processor. Imports NestjsVectorSearchModule
 * (CodeSearchService) and NestjsRepositoriesModule (WorkspaceLocalRepositoriesService) so the
 * processor can resolve a repository's filesystem path and run the engine index.
 */
@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule,
    NestjsBullmqModule.registerQueue(CODE_INDEX_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(CODE_INDEX_QUEUE_NAME),
  ],
  providers: [CodeIndexProcessor],
})
export class CodeIndexQueueModule {}
