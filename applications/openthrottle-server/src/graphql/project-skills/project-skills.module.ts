/**
 * @description Registers the per-project skill universe query (`projectSkills`)
 * and its GraphQL ObjectTypes.
 */

import './project-skill.object.ts';
import './project-skills.input.ts';

import { Module } from '@nestjs/common';
import {
  ProjectsModule,
  RolesModule,
  ServiceAccountsModule,
} from '@openthrottle/nestjs-repositories-server';

import { ProjectSkillsModule } from '../../services/project-skills/project-skills.module.ts';
import { ProjectSkillsResolver } from './project-skills.resolver.ts';

@Module({
  imports: [
    ProjectSkillsModule,
    ProjectsModule,
    RolesModule,
    ServiceAccountsModule,
  ],
  providers: [ProjectSkillsResolver],
})
export class ProjectSkillsGraphqlModule {}
