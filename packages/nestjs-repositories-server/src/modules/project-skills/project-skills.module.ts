import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectSkill } from './project-skill.entity.ts';
import { ProjectSkillsRepository } from './project-skills.repository.ts';

/**
 * @description Registers {@link ProjectSkill} on the default connection and provides
 * {@link ProjectSkillsRepository}.
 * @public
 */
@Module({
  exports: [ProjectSkillsRepository],
  imports: [TypeOrmModule.forFeature([ProjectSkill])],
  providers: [ProjectSkillsRepository],
})
export class ProjectSkillsModule {}
