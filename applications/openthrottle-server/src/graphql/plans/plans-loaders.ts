/**
 * @description Request-scoped DataLoaders for PlansResolver (project by id, task count by plan id, plan hooks by plan id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving relation fields across many plan rows.
 */

import {
  type GroupedHooks,
  type Project,
  ProjectsService,
  TASK_STATUS,
  TasksService,
  createEntityByIdLoader,
  createGroupedCountLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

/**
 * Task statuses that count as "resolved" for {@link PlansLoaders.tasksCompletedCountByPlanIdLoader}
 * — mirrors client `getResolvedTaskCount` (COMPLETED + SKIPPED).
 */
const RESOLVED_TASK_STATUSES = [
  TASK_STATUS.COMPLETED,
  TASK_STATUS.SKIPPED,
] as const;

/**
 * @description Holds project and task-count DataLoaders for the current request. Injected into PlansResolver; resolve projectRelation, taskCount, and tasksCompletedCount via loaders instead of one service call per plan row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlansLoaders {
  readonly planHooksByPlanIdLoader: DataLoader<string, GroupedHooks>;
  readonly projectLoader: DataLoader<string, Project | null>;
  readonly taskCountByPlanIdLoader: DataLoader<string, number>;
  readonly tasksCompletedCountByPlanIdLoader: DataLoader<string, number>;

  constructor(projectsService: ProjectsService, tasksService: TasksService) {
    this.projectLoader = createEntityByIdLoader(projectsService);
    this.taskCountByPlanIdLoader = createGroupedCountLoader(tasksService, {
      column: 'planId',
    });
    this.tasksCompletedCountByPlanIdLoader = createGroupedCountLoader(
      tasksService,
      {
        column: 'planId',
        filter: {
          column: 'status',
          values: RESOLVED_TASK_STATUSES,
        },
      },
    );

    /*
      beforeHooks and afterHooks are two ResolveFields over the same row set, so
      without this they issued the same query twice per plan. The loader batches
      across plan ids too, so a list of plans costs one round-trip rather than
      two per plan.
    */
    this.planHooksByPlanIdLoader = new DataLoader<string, GroupedHooks>(
      async (planIds) => {
        const byPlanId = await tasksService.getPlanHooksForPlans(planIds);

        return planIds.map(
          (planId) => byPlanId.get(planId) ?? { after: [], before: [] },
        );
      },
    );
  }
}
