import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { SkillTagsModule } from '@openthrottle/nestjs-repositories-server';

import { PlanTag } from './plan-tag.entity.ts';
import { ProjectTag } from './project-tag.entity.ts';
import { TagsService } from './tags.service.ts';
import { TaskTag } from './task-tag.entity.ts';

@Module({
  controllers: [],
  exports: [TagsService],
  imports: [
    LoggerModule,
    SkillTagsModule,
    TypeOrmModule.forFeature([PlanTag, ProjectTag, TaskTag]),
  ],
  providers: [TagsService],
})
export class TagsModule {}
