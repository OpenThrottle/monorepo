/**
 * @description Request-scoped DataLoaders for PlansResolver (project by id, task count by plan id, plan hooks by plan id, soonest scheduled run by plan id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving relation fields across many plan rows.
 */

import { Injectable, Scope } from '@nestjs/common';
import {
  createEntityByIdLoader,
  createGroupedCountLoader,
  type GroupedHooks,
  PlanRunsService,
  type Project,
  ProjectsService,
  type ScheduledPlanRun,
  TASK_STATUS,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import DataLoader from 'dataloader';

/**
 * Task statuses that count as "resolved" for {@link PlansLoaders.tasksCompletedCountByPlanIdLoader}
 * — mirrors client `getResolvedTaskCount` (COMPLETED + SKIPPED + PROMOTED; PROMOTED is
 * resolved but not complete: the work continued as its own plan).
 */
const RESOLVED_TASK_STATUSES = [
  TASK_STATUS.COMPLETED,
  TASK_STATUS.PROMOTED,
  TASK_STATUS.SKIPPED,
] as const;

/**
 * @description Holds project and task-count DataLoaders for the current request. Injected into PlansResolver; resolve projectRelation, taskCount, and tasksCompletedCount via loaders instead of one service call per plan row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlansLoaders {
  readonly planHooksByPlanIdLoader: DataLoader<string, GroupedHooks>;
  readonly projectLoader: DataLoader<string, Project | null>;
  readonly scheduledRunByPlanIdLoader: DataLoader<
    string,
    ScheduledPlanRun | null
  >;
  readonly taskCountByPlanIdLoader: DataLoader<string, number>;
  readonly tasksCompletedCountByPlanIdLoader: DataLoader<string, number>;

  constructor(
    planRunsService: PlanRunsService,
    projectsService: ProjectsService,
    tasksService: TasksService,
  ) {
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

    // One grouped query for a whole list of plans: each plan's soonest SCHEDULED run (id and
    // instant), or null. `scheduledRunAt` and `scheduledRunId` both read it, and the loader's
    // per-request cache means the second field costs no extra round trip.
    this.scheduledRunByPlanIdLoader = new DataLoader<
      string,
      ScheduledPlanRun | null
    >(async (planIds) => {
      const byPlanId =
        await planRunsService.findEarliestScheduledForByPlanIds(planIds);

      return planIds.map((planId) => byPlanId.get(planId) ?? null);
    });

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
