import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { SkillTagsModule } from '../skill-tags/skill-tags.module';
import { PlanTag } from './plan-tag.entity';
import { ProjectTag } from './project-tag.entity';
import { TagsService } from './tags.service';
import { TaskTag } from './task-tag.entity';

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
