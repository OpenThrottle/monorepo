/**
 * @description Request-scoped DataLoaders for tag relation fields (tags by plan
 * id, tags by task id). One instance per GraphQL request to batch and cache
 * within the request and avoid N+1 when resolving tags across many rows.
 */

import {
  type PlanTag,
  type ProjectTag,
  type TaskTag,
  TagsService,
  createCollectionByColumnLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
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

  constructor(tagsService: TagsService) {
    this.planTagsByPlanIdLoader = createCollectionByColumnLoader(
      { getRepository: () => tagsService.getPlanTagsRepository() },
      { column: 'planId', order: { tag: 'ASC' } },
    );
    this.projectTagsByProjectIdLoader = createCollectionByColumnLoader(
      { getRepository: () => tagsService.getProjectTagsRepository() },
      { column: 'projectId', order: { tag: 'ASC' } },
    );
    this.taskTagsByTaskIdLoader = createCollectionByColumnLoader(
      { getRepository: () => tagsService.getTaskTagsRepository() },
      { column: 'taskId', order: { tag: 'ASC' } },
    );
  }
}
