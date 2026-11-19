/**
 * @description Request-scoped DataLoaders for TasksResolver (plan and project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createEntityByIdLoader } from '@openthrottle/nestjs-postgres';
import type { Plan, Project } from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type DataLoader from 'dataloader';

/**
 * @description Holds plan and project DataLoaders for the current request. Injected into TasksResolver; resolve plan and projectRelation via loaders instead of direct service calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class TasksLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;
  readonly projectLoader: DataLoader<string, Project | null>;

  constructor(
    plansRepository: PlansRepository,
    projectsRepository: ProjectsRepository,
  ) {
    this.planLoader = createEntityByIdLoader(plansRepository);
    this.projectLoader = createEntityByIdLoader(projectsRepository);
  }
}
