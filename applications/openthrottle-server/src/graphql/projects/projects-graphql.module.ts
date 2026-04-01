/**
 * @description GraphQL module that registers ProjectsResolver and imports NestjsRepositoriesModule for ProjectsService. Registers request-scoped ProjectsLoaders for Project.plans and Project.tasks resolution.
 */

import { Module } from '@nestjs/common';
import {
  NestjsRepositoriesModule,
  ProjectsLoaders,
} from '@openthrottle/nestjs-repositories';
import { ProjectsResolver } from './projects.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [ProjectsLoaders, ProjectsResolver],
})
export class ProjectsGraphqlModule {}
