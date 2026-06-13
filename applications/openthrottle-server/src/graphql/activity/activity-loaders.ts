/**
 * @description Request-scoped DataLoaders for the activity row resolvers (plan and task by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving plan/task relations across many activity rows.
 */

import {
  type Plan,
  type Task,
  PlansService,
  TasksService,
  createEntityByIdLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';

/**
 * @description Holds plan and task DataLoaders for the current request. Injected into the activity row resolvers; resolve plan and task via loaders instead of one findOne per activity row.
 */
@Injectable({ scope: Scope.REQUEST })
export class ActivityLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;
  readonly taskLoader: DataLoader<string, Task | null>;

  constructor(plansService: PlansService, tasksService: TasksService) {
    this.planLoader = createEntityByIdLoader(plansService);
    this.taskLoader = createEntityByIdLoader(tasksService);
  }
}
