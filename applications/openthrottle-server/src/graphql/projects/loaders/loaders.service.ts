/**
 * @description Request-scoped DataLoaders for resolving Project.plans and
 * Project.tasks in key order. Batches by projectId to avoid N+1 when resolving many projects.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createCollectionByColumnLoader } from '@openthrottle/nestjs-postgres';
import type { Plan, Task } from '@openthrottle/nestjs-repositories-server';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import type DataLoader from 'dataloader';

/**
 * Holds plansByProjectId and tasksByProjectId DataLoaders for the current request.
 * Injected into ProjectsResolver; resolve plans and tasks via loaders instead of direct repository find calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class ProjectsLoaders {
  /** Plans grouped by projectId, each ordered by createdAt DESC. */
  readonly plansByProjectIdLoader: DataLoader<string, Plan[]>;
  /** Tasks grouped by projectId, each ordered by planId then sortOrder then createdAt ASC. */
  readonly tasksByProjectIdLoader: DataLoader<string, Task[]>;

  constructor(
    plansRepository: PlansRepository,
    tasksRepository: TasksRepository,
  ) {
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
