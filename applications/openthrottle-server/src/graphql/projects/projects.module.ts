/**
 * @description GraphQL module that registers ProjectsResolver and imports the plans, projects and tasks table modules for ProjectsRepository. Registers request-scoped ProjectsLoaders for Project.plans and Project.tasks resolution.
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  ProjectsModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { ProjectsLoaders } from './loaders/loaders.service.ts';
import { ProjectsResolver } from './projects.resolver.ts';

@Module({
  imports: [PlansModule, ProjectsModule, TasksModule],
  providers: [ProjectsLoaders, ProjectsResolver],
})
export class ProjectsGraphqlModule {}
