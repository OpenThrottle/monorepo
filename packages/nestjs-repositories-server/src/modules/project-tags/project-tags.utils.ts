import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ProjectTag } from './project-tag.entity.ts';
import type { ProjectTagsRepositoryMock } from './project-tags.types.ts';

/**
 * @description Builds a {@link ProjectTagsRepositoryMock} that starts as an empty `project_tags`
 * table (see `createBaseRepositoryMock`): `findByProjectAndTag` finds nothing and
 * `listForPlanProject` returns no rows. Provide it in place of `ProjectTagsRepository` and stub
 * per test. Test-only: imports `vitest`.
 * @public
 */
export function createProjectTagsRepositoryMock(): ProjectTagsRepositoryMock {
  return {
    ...createBaseRepositoryMock<ProjectTag, CreateModelInput<ProjectTag>>(
      'project_tags',
    ),
    findByProjectAndTag: vi.fn(async () => {
      return null;
    }),
    listForPlanProject: vi.fn(async () => {
      return [];
    }),
  };
}
