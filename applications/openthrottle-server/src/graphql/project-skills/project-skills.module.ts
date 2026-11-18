/**
 * @description Registers the per-project skill universe query (`projectSkills`)
 * and its GraphQL ObjectTypes.
 */

import './project-skill.object.ts';
import './project-skills.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  ProjectsModule,
  ServiceAccountsModule,
} from '@openthrottle/nestjs-repositories-server';

import { ProjectSkillsResolver } from './project-skills.resolver.ts';

@Module({
  imports: [ServiceAccountsModule, NestjsRepositoriesModule, ProjectsModule],
  providers: [ProjectSkillsResolver],
})
export class ProjectSkillsGraphqlModule {}
