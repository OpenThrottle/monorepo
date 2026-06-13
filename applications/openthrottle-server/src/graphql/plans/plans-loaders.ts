/**
 * @description Request-scoped DataLoaders for PlansResolver (project by id, task count by plan id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving relation fields across many plan rows.
 */

import {
  type Project,
  ProjectsService,
  TasksService,
  createEntityByIdLoader,
  createGroupedCountLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';

/**
 * @description Holds project and task-count DataLoaders for the current request. Injected into PlansResolver; resolve projectRelation and taskCount via loaders instead of one service call per plan row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlansLoaders {
  readonly projectLoader: DataLoader<string, Project | null>;
  readonly taskCountByPlanIdLoader: DataLoader<string, number>;

  constructor(projectsService: ProjectsService, tasksService: TasksService) {
    this.projectLoader = createEntityByIdLoader(projectsService);
    this.taskCountByPlanIdLoader = createGroupedCountLoader(tasksService, {
      column: 'planId',
    });
  }
}
