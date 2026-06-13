/**
 * @description Request-scoped DataLoader for TaskEmbeddingsResolver (task by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the task relation across many embedding rows.
 */

import { type Task, TasksService } from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds a task DataLoader for the current request. Injected into TaskEmbeddingsResolver; resolve task via the loader instead of one findOne per embedding row.
 */
@Injectable({ scope: Scope.REQUEST })
export class TaskEmbeddingsLoaders {
  readonly taskLoader: DataLoader<string, Task | null>;

  constructor(private readonly tasksService: TasksService) {
    this.taskLoader = createLoaderFromFindByIds<string, Task>(async (ids) => {
      if (ids.length === 0) return [];

      const list = await this.tasksService
        .getRepository()
        .find({ where: { id: In(ids) } });

      return list;
    });
  }
}
