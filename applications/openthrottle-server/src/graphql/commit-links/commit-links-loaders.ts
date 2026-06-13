/**
 * @description Request-scoped DataLoaders for CommitLinksResolver (plan and task by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving plan/task relations across many commit-link rows.
 */

import {
  type Plan,
  type Task,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds plan and task DataLoaders for the current request. Injected into CommitLinksResolver; resolve plan and task via loaders instead of one findOne per commit-link row.
 */
@Injectable({ scope: Scope.REQUEST })
export class CommitLinksLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;
  readonly taskLoader: DataLoader<string, Task | null>;

  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    this.planLoader = createLoaderFromFindByIds<string, Plan>(async (ids) => {
      if (ids.length === 0) return [];

      const list = await this.plansService
        .getRepository()
        .find({ where: { id: In(ids) } });

      return list;
    });

    this.taskLoader = createLoaderFromFindByIds<string, Task>(async (ids) => {
      if (ids.length === 0) return [];

      const list = await this.tasksService
        .getRepository()
        .find({ where: { id: In(ids) } });

      return list;
    });
  }
}
