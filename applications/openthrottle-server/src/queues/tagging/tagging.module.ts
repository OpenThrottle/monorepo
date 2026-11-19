import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlansModule,
  PlanTagsModule,
  ServiceAccountsModule,
  SkillTagsModule,
  TasksModule,
  TaskTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { SourceControlModule } from '../../services/source-control/source-control.module.ts';
import { TagsModule } from '../../services/tags/tags.module.ts';
import { PlanRulesQueueProducerModule } from '../plan-rules/producer/producer.module.ts';
import { TaggingQueueProducerModule } from './producer/producer.module.ts';
import { TaggingProcessor } from './tagging.processor.ts';
import { taggingModelProviderFactory } from './tagging-model.provider.ts';

/**
 * @description Processor half of the tagging queue: the WorkerHost for the
 * predict/refine tagging jobs plus the env-selected
 * {@link taggingModelProviderFactory}. Loaded only under PROCESS_ROLE
 * worker/all.
 */
@Module({
  exports: [TaggingQueueProducerModule],
  imports: [
    ServiceAccountsModule,
    ConfigModule,
    LoggerModule,
    PlanRulesQueueProducerModule,
    PlansModule,
    PlanTagsModule,
    SkillTagsModule,
    SourceControlModule,
    TaggingQueueProducerModule,
    TagsModule,
    TasksModule,
    TaskTagsModule,
  ],
  providers: [taggingModelProviderFactory, TaggingProcessor],
})
export class TaggingQueueModule {}
