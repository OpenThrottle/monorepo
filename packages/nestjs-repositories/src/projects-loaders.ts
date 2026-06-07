/**
 * @description Request-scoped DataLoaders for resolving Project.plans and
 * Project.tasks in key order. Batches by projectId to avoid N+1 when resolving many projects.
 */

import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { In } from 'typeorm';
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
  readonly plansByProjectIdLoader: DataLoader<string, Plan[]>;
  readonly tasksByProjectIdLoader: DataLoader<string, Task[]>;

  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    this.plansByProjectIdLoader = new DataLoader<string, Plan[]>(
      this.batchPlansByProjectId.bind(this),
    );
    this.tasksByProjectIdLoader = new DataLoader<string, Task[]>(
      this.batchTasksByProjectId.bind(this),
    );
  }

  /**
   * @description Loads plans for many projectIds in one query; returns arrays
   * in key order, each ordered by createdAt DESC.
   */
  private async batchPlansByProjectId(
    projectIds: readonly string[],
  ): Promise<Plan[][]> {
    if (projectIds.length === 0) return [];

    const ids = [...new Set(projectIds)];
    const plans = await this.plansService.getRepository().find({
      order: { createdAt: 'DESC' },
      where: { projectId: In(ids) },
    });

    const byProjectId = new Map<string, Plan[]>();
    for (const plan of plans) {
      const pid = plan.projectId;
      if (pid != null) {
        const list = byProjectId.get(pid) ?? [];
        list.push(plan);
        byProjectId.set(pid, list);
      }
    }

    return projectIds.map((id) => byProjectId.get(id) ?? []);
  }

  /**
   * @description Loads tasks for many projectIds in one query; returns arrays
   * in key order, each ordered by planId then sortOrder then createdAt ASC.
   */
  private async batchTasksByProjectId(
    projectIds: readonly string[],
  ): Promise<Task[][]> {
    if (projectIds.length === 0) return [];

    const ids = [...new Set(projectIds)];
    const tasks = await this.tasksService.getRepository().find({
      order: { ...CROSS_PLAN_TASK_LIST_ORDER },
      where: { projectId: In(ids) },
    });

    const byProjectId = new Map<string, Task[]>();
    for (const task of tasks) {
      const pid = task.projectId;
      if (pid != null) {
        const list = byProjectId.get(pid) ?? [];
        list.push(task);
        byProjectId.set(pid, list);
      }
    }

    return projectIds.map((id) => byProjectId.get(id) ?? []);
  }
}
