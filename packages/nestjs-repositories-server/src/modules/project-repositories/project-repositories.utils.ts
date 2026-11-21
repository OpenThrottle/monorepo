import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type {
  ProjectRepositoriesRepositoryMock,
  ProjectRepositoryCreateInput,
} from './project-repositories.types.ts';
import type { ProjectRepository } from './project-repository.entity.ts';

/**
 * @description Builds a {@link ProjectRepositoriesRepositoryMock} that starts as an empty
 * `project_repositories` table (see `createBaseRepositoryMock`): no link is found, nothing is
 * listed, `unlink` reports no match and `syncLegacyProject` does nothing. `link` has no default
 * answer and rejects until stubbed. Provide it in place of `ProjectRepositoriesRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createProjectRepositoriesRepositoryMock(): ProjectRepositoriesRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ProjectRepository,
      ProjectRepositoryCreateInput
    >('project_repositories'),
    findByProjectAndRepository: vi.fn(async () => {
      return null;
    }),
    link: vi.fn(async () => {
      throw new Error(
        'createProjectRepositoriesRepositoryMock: stub link before calling it',
      );
    }),
    listProjectsByRepositoryIds: vi.fn(async () => {
      return new Map();
    }),
    listRepositoriesByProjectIds: vi.fn(async () => {
      return new Map();
    }),
    syncLegacyProject: vi.fn(async () => {
      return undefined;
    }),
    unlink: vi.fn(async () => {
      return false;
    }),
  };
}
