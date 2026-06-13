/**
 * @description Request-scoped DataLoaders for PlansResolver (project by id, task count by plan id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving relation fields across many plan rows.
 */

import {
  type Project,
  ProjectsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds project and task-count DataLoaders for the current request. Injected into PlansResolver; resolve projectRelation and taskCount via loaders instead of one service call per plan row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlansLoaders {
  readonly projectLoader: DataLoader<string, Project | null>;
  readonly taskCountByPlanIdLoader: DataLoader<string, number>;

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {
    this.projectLoader = createLoaderFromFindByIds<string, Project>(
      async (ids) => {
        if (ids.length === 0) return [];

        const list = await this.projectsService
          .getRepository()
          .find({ where: { id: In(ids) } });

        return list;
      },
    );

    this.taskCountByPlanIdLoader = new DataLoader<string, number>(
      this.batchTaskCountByPlanId.bind(this),
    );
  }

  /**
   * @description Counts tasks for many planIds in a single grouped query and
   * returns counts in key order (0 for plans with no tasks).
   */
  private async batchTaskCountByPlanId(
    planIds: readonly string[],
  ): Promise<number[]> {
    if (planIds.length === 0) return [];

    const ids = [...new Set(planIds)];
    const rows = await this.tasksService
      .getRepository()
      .createQueryBuilder('task')
      .select('task.planId', 'planId')
      .addSelect('COUNT(*)', 'count')
      .where('task.planId IN (:...ids)', { ids })
      .groupBy('task.planId')
      .getRawMany<{ count: string; planId: string }>();

    const countByPlanId = new Map<string, number>();
    for (const row of rows) {
      countByPlanId.set(row.planId, Number(row.count));
    }

    return planIds.map((id) => countByPlanId.get(id) ?? 0);
  }
}
