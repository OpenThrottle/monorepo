import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanTagsModule,
  ProjectTagsModule,
  SkillTagsModule,
  TaskTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { TagsService } from './tags.service.ts';

/**
 * @description Provides {@link TagsService}: the vocabulary validation, provenance ladder and
 * effective-tag rollup over the plan, task and project tag tables.
 */
@Module({
  exports: [TagsService],
  imports: [
    LoggerModule,
    PlanTagsModule,
    ProjectTagsModule,
    SkillTagsModule,
    TaskTagsModule,
  ],
  providers: [TagsService],
})
export class TagsModule {}
