/**
 * @description Registers the per-project skill universe query (`projectSkills`)
 * and its GraphQL ObjectTypes.
 */

import './project-skill.object';
import './project-skills.input';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ProjectSkillsResolver } from './project-skills.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [ProjectSkillsResolver],
})
export class ProjectSkillsGraphqlModule {}
