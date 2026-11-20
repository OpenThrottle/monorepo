/**
 * @description Request-scoped DataLoaders for resolving Project.plans and
 * Project.tasks in key order. Batches by projectId to avoid N+1 when resolving many projects.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createCollectionByColumnLoader } from '@openthrottle/nestjs-postgres';
import type {
  Plan,
  Repository,
  Task,
} from '@openthrottle/nestjs-repositories-server';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  PlansRepository,
  ProjectRepositoriesRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import DataLoader from 'dataloader';

/**
 * Holds plansByProjectId and tasksByProjectId DataLoaders for the current request.
 * Injected into ProjectsResolver; resolve plans and tasks via loaders instead of direct repository find calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class ProjectsLoaders {
  /** Plans grouped by projectId, each ordered by createdAt DESC. */
  readonly plansByProjectIdLoader: DataLoader<string, Plan[]>;
  /** Live repositories linked to each project through project_repositories, oldest link first. */
  readonly repositoriesByProjectIdLoader: DataLoader<string, Repository[]>;
  /** Tasks grouped by projectId, each ordered by planId then sortOrder then createdAt ASC. */
  readonly tasksByProjectIdLoader: DataLoader<string, Task[]>;

  constructor(
    plansRepository: PlansRepository,
    projectRepositoriesRepository: ProjectRepositoriesRepository,
    tasksRepository: TasksRepository,
  ) {
    this.repositoriesByProjectIdLoader = new DataLoader<string, Repository[]>(
      async (projectIds) => {
        const grouped =
          await projectRepositoriesRepository.listRepositoriesByProjectIds(
            projectIds,
          );
        return projectIds.map((projectId) => grouped.get(projectId) ?? []);
      },
    );
    this.plansByProjectIdLoader = createCollectionByColumnLoader(
      plansRepository,
      {
        column: 'projectId',
        order: { createdAt: 'DESC' },
      },
    );
    this.tasksByProjectIdLoader = createCollectionByColumnLoader(
      tasksRepository,
      {
        column: 'projectId',
        order: { ...CROSS_PLAN_TASK_LIST_ORDER },
      },
    );
  }
}
