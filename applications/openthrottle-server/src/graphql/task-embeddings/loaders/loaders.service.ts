/**
 * @description Request-scoped DataLoader for TaskEmbeddingsResolver (task by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the task relation across many embedding rows.
 */

import { Injectable, Scope } from '@nestjs/common';
import {
  createEntityByIdLoader,
  type Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type DataLoader from 'dataloader';

/**
 * @description Holds a task DataLoader for the current request. Injected into TaskEmbeddingsResolver; resolve task via the loader instead of one findOne per embedding row.
 */
@Injectable({ scope: Scope.REQUEST })
export class TaskEmbeddingsLoaders {
  readonly taskLoader: DataLoader<string, Task | null>;

  constructor(tasksService: TasksService) {
    this.taskLoader = createEntityByIdLoader(tasksService);
  }
}
