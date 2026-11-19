import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  ProjectSkillsModule as ProjectSkillsRepositoryModule,
  SkillTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { ProjectSkillsService } from './project-skills.service.ts';

/**
 * @description Provides {@link ProjectSkillsService}: the per-project skill universe read and the
 * record-level skill tag writes over the project_skills table.
 */
@Module({
  exports: [ProjectSkillsService],
  imports: [LoggerModule, ProjectSkillsRepositoryModule, SkillTagsModule],
  providers: [ProjectSkillsService],
})
export class ProjectSkillsModule {}
