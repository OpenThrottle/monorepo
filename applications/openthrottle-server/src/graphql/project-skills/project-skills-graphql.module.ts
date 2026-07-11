/**
 * @description Registers the per-project skill universe query (`projectSkills`)
 * and its GraphQL ObjectTypes.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import './project-skill.object';
import { ProjectSkillsResolver } from './project-skills.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [ProjectSkillsResolver],
})
export class ProjectSkillsGraphqlModule {}
