import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { SkillTagsModule } from '../skill-tags/skill-tags.module.ts';
import { ProjectSkill } from './project-skill.entity.ts';
import { ProjectSkillsService } from './project-skills.service.ts';

@Module({
  controllers: [],
  exports: [ProjectSkillsService],
  imports: [
    LoggerModule,
    SkillTagsModule,
    TypeOrmModule.forFeature([ProjectSkill]),
  ],
  providers: [ProjectSkillsService],
})
export class ProjectSkillsModule {}
