import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { TagSource } from '../plan-tags/tag-source/tag-source.types.ts';
import type { TaskTag } from './task-tag.entity.ts';
import type { TaskTagsRepository } from './task-tags.repository.ts';

/**
 * @description Scalar fields of a task tag that GraphQL objects and DTOs mirror.
 * @public
 */
export interface TaskTagData {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly id: string;
  readonly source: TagSource;
  readonly tag: string;
  readonly taskId: string;
}

/**
 * @description A {@link TaskTagsRepository} mock: every inherited `BaseRepository` method plus
 * the task-tag lookups.
 * @public
 */
export interface TaskTagsRepositoryMock extends BaseRepositoryMock<
  TaskTag,
  CreateModelInput<TaskTag>
> {
  readonly findByTaskAndTag: Mock<TaskTagsRepository['findByTaskAndTag']>;
  readonly listForPlan: Mock<TaskTagsRepository['listForPlan']>;
  readonly listTaskIdsByPlanAndTags: Mock<
    TaskTagsRepository['listTaskIdsByPlanAndTags']
  >;
}
