/**
 * @description Request-scoped DataLoaders for TasksResolver (plan and project by id). One instance per GraphQL request to batch and cache within the request and avoid N+1.
 */

import {
  type Plan,
  type Project,
  PlansService,
  ProjectsService,
} from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds plan and project DataLoaders for the current request. Injected into TasksResolver; resolve plan and projectRelation via loaders instead of direct service calls.
 */
@Injectable({ scope: Scope.REQUEST })
export class TasksLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;
  readonly projectLoader: DataLoader<string, Project | null>;

  constructor(
    private readonly plansService: PlansService,
    private readonly projectsService: ProjectsService,
  ) {
    this.planLoader = createLoaderFromFindByIds<string, Plan>(async (ids) => {
      if (ids.length === 0) return [];

      const list = await this.plansService
        .getRepository()
        .find({ where: { id: In(ids) } });

      return list;
    });

    this.projectLoader = createLoaderFromFindByIds<string, Project>(
      async (ids) => {
        if (ids.length === 0) return [];

        const list = await this.projectsService
          .getRepository()
          .find({ where: { id: In(ids) } });

        return list;
      },
    );
  }
}
