/**
 * @description GraphQL module that registers ProjectsResolver and imports the plans, projects and tasks table modules for ProjectsRepository. Registers request-scoped ProjectsLoaders for Project.plans, Project.tasks and Project.repositories resolution, and the project-run surface (ProjectRunResolver, ProjectLatestRunResolver, ProjectRunLoaders).
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  ProjectRepositoriesModule,
  ProjectRunsModule,
  ProjectsModule,
  RepositoriesModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { PlanProjectMembershipModule } from '../../services/plan-project-membership/plan-project-membership.module.ts';
import { ProjectRunAdvanceModule } from '../../services/project-run-advance/project-run-advance.module.ts';
import { ProjectsLoaders } from './loaders/loaders.service.ts';
import { ProjectLatestRunResolver } from './project-latest-run/project-latest-run.resolver.ts';
import { ProjectRunLoaders } from './project-run/loaders/loaders.service.ts';
import { ProjectRunResolver } from './project-run/project-run.resolver.ts';
import { ProjectsResolver } from './projects.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    PlanProjectMembershipModule,
    PlansModule,
    ProjectRepositoriesModule,
    ProjectRunAdvanceModule,
    ProjectRunsModule,
    ProjectsModule,
    RepositoriesModule,
    TasksModule,
  ],
  providers: [
    ProjectLatestRunResolver,
    ProjectRunLoaders,
    ProjectRunResolver,
    ProjectsLoaders,
    ProjectsResolver,
  ],
})
export class ProjectsGraphqlModule {}
