/**
 * @description GraphQL module that registers ProjectsResolver and imports the plans, projects and tasks table modules for ProjectsRepository. Registers request-scoped ProjectsLoaders for Project.plans, Project.tasks and Project.repositories resolution.
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  ProjectRepositoriesModule,
  ProjectsModule,
  RepositoriesModule,
  RolesModule,
  TasksModule,
  UserFavoriteProjectsModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { PlanProjectMembershipModule } from '../../services/plan-project-membership/plan-project-membership.module.ts';
import { ProjectsLoaders } from './loaders/loaders.service.ts';
import { ProjectsResolver } from './projects.resolver.ts';

@Module({
  imports: [
    PlanProjectMembershipModule,
    PlansModule,
    ProjectRepositoriesModule,
    ProjectsModule,
    RepositoriesModule,
    RolesModule,
    TasksModule,
    UserFavoriteProjectsModule,
  ],
  providers: [GqlPermissionsGuard, ProjectsLoaders, ProjectsResolver],
})
export class ProjectsGraphqlModule {}
