/**
 * @description Request-scoped DataLoaders for tag relation fields (tags by plan
 * id, tags by task id). One instance per GraphQL request to batch and cache
 * within the request and avoid N+1 when resolving tags across many rows.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createCollectionByColumnLoader } from '@openthrottle/nestjs-repositories';
import type {
  PlanTag,
  ProjectTag,
  TaskTag,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlanTagsRepository,
  ProjectTagsRepository,
  TaskTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type DataLoader from 'dataloader';

/**
 * @description Holds plan-tag and task-tag collection DataLoaders for the
 * current request. Injected into TagsResolver's ResolveFields on
 * PlanObject/TaskObject.
 */
@Injectable({ scope: Scope.REQUEST })
export class TagsLoaders {
  readonly planTagsByPlanIdLoader: DataLoader<string, PlanTag[]>;
  readonly projectTagsByProjectIdLoader: DataLoader<string, ProjectTag[]>;
  readonly taskTagsByTaskIdLoader: DataLoader<string, TaskTag[]>;

  constructor(
    planTagsRepository: PlanTagsRepository,
    projectTagsRepository: ProjectTagsRepository,
    taskTagsRepository: TaskTagsRepository,
  ) {
    this.planTagsByPlanIdLoader = createCollectionByColumnLoader(
      planTagsRepository,
      { column: 'planId', order: { tag: 'ASC' } },
    );
    this.projectTagsByProjectIdLoader = createCollectionByColumnLoader(
      projectTagsRepository,
      { column: 'projectId', order: { tag: 'ASC' } },
    );
    this.taskTagsByTaskIdLoader = createCollectionByColumnLoader(
      taskTagsRepository,
      { column: 'taskId', order: { tag: 'ASC' } },
    );
  }
}
