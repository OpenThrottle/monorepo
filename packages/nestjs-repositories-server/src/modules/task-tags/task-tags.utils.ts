import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { TaskTag } from './task-tag.entity.ts';
import type { TaskTagsRepositoryMock } from './task-tags.types.ts';

/**
 * @description Builds a {@link TaskTagsRepositoryMock} that starts as an empty `task_tags` table
 * (see `createBaseRepositoryMock`): `findByTaskAndTag` finds nothing and `listForPlan` returns no
 * rows. Provide it in place of `TaskTagsRepository` and stub per test. Test-only: imports
 * `vitest`.
 * @public
 */
export function createTaskTagsRepositoryMock(): TaskTagsRepositoryMock {
  return {
    ...createBaseRepositoryMock<TaskTag, CreateModelInput<TaskTag>>(
      'task_tags',
    ),
    findByTaskAndTag: vi.fn(async () => {
      return null;
    }),
    listForPlan: vi.fn(async () => {
      return [];
    }),
    listTaskIdsByPlanAndTags: vi.fn(async () => {
      return [];
    }),
  };
}
