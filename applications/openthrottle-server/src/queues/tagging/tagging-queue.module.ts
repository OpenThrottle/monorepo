import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHubModule } from '@openthrottle/nestjs-github';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanRulesQueueProducerModule } from '../plan-rules/plan-rules-queue-producer.module';
import { TaggingProcessor } from './tagging.processor';
import { taggingModelProviderFactory } from './tagging-model-providers';
import { TaggingQueueProducerModule } from './tagging-queue-producer.module';

/**
 * @description Processor half of the tagging queue: the WorkerHost for the
 * predict/refine tagging jobs plus the env-selected
 * {@link taggingModelProviderFactory}. Loaded only under PROCESS_ROLE
 * worker/all.
 */
@Module({
  exports: [TaggingQueueProducerModule],
  imports: [
    ConfigModule,
    GitHubModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRulesQueueProducerModule,
    TaggingQueueProducerModule,
  ],
  providers: [taggingModelProviderFactory, TaggingProcessor],
})
export class TaggingQueueModule {}
