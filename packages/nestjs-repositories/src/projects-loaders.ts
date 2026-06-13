/**
 * @description Request-scoped DataLoaders for resolving Project.plans and
 * Project.tasks in key order. Batches by projectId to avoid N+1 when resolving many projects.
 */

import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { createCollectionByColumnLoader } from './common/entity-loaders';
import { PlansService } from './modules/plans/plans.service';
import {
  CROSS_PLAN_TASK_LIST_ORDER,
  TasksService,
} from './modules/tasks/tasks.service';
import type { Plan } from './modules/plans/plan.entity';
import type { Task } from './modules/tasks/task.entity';

/**
 * Holds plansByProjectId and tasksByProjectId DataLoaders for the current request.
 * Injected into ProjectsResolver; resolve plans and tasks via loaders instead of direct service find calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class ProjectsLoaders {
  /** Plans grouped by projectId, each ordered by createdAt DESC. */
  readonly plansByProjectIdLoader: DataLoader<string, Plan[]>;
  /** Tasks grouped by projectId, each ordered by planId then sortOrder then createdAt ASC. */
  readonly tasksByProjectIdLoader: DataLoader<string, Task[]>;

  constructor(plansService: PlansService, tasksService: TasksService) {
    this.plansByProjectIdLoader = createCollectionByColumnLoader(plansService, {
      column: 'projectId',
      order: { createdAt: 'DESC' },
    });
    this.tasksByProjectIdLoader = createCollectionByColumnLoader(tasksService, {
      column: 'projectId',
      order: { ...CROSS_PLAN_TASK_LIST_ORDER },
    });
  }
}
