import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type {
  RepositoriesRepositoryMock,
  RepositoryCreateInput,
} from './repositories.types.ts';
import type { Repository } from './repository.entity.ts';

/**
 * @description Builds a {@link RepositoriesRepositoryMock} that starts as an empty `repositories`
 * table (see `createBaseRepositoryMock`): nothing is found, `mergeDetectedRemote` reports a
 * missing repository and `removeRepository` reports no match. Provide it in place of
 * `RepositoriesRepository` and stub per test. `findOrCreateByRemoteUrl` has no default answer
 * and rejects until stubbed. Test-only: imports `vitest`.
 * @public
 */
export function createRepositoriesRepositoryMock(): RepositoriesRepositoryMock {
  return {
    ...createBaseRepositoryMock<Repository, RepositoryCreateInput>(
      'repositories',
    ),
    findByNormalizedRemoteUrl: vi.fn(async () => {
      return null;
    }),
    findOrCreateByRemoteUrl: vi.fn(async () => {
      throw new Error(
        'createRepositoriesRepositoryMock: stub findOrCreateByRemoteUrl before calling it',
      );
    }),
    findRepositoryById: vi.fn(async () => {
      return null;
    }),
    mergeDetectedRemote: vi.fn(async () => {
      return null;
    }),
    removeRepository: vi.fn(async () => {
      return false;
    }),
    updateRepository: vi.fn(async () => {
      return null;
    }),
  };
}
