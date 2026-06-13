/**
 * @description Request-scoped DataLoaders for TasksResolver (plan and project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1.
 */

import {
  type Plan,
  type Project,
  PlansService,
  ProjectsService,
  createEntityByIdLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';

/**
 * @description Holds plan and project DataLoaders for the current request. Injected into TasksResolver; resolve plan and projectRelation via loaders instead of direct service calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class TasksLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;
  readonly projectLoader: DataLoader<string, Project | null>;

  constructor(plansService: PlansService, projectsService: ProjectsService) {
    this.planLoader = createEntityByIdLoader(plansService);
    this.projectLoader = createEntityByIdLoader(projectsService);
  }
}
