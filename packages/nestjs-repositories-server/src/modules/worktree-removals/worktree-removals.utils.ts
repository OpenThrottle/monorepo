import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { WorktreeRemoval } from './worktree-removal.entity.ts';
import type { WorktreeRemovalsRepositoryMock } from './worktree-removals.types.ts';

/**
 * @description Builds a {@link WorktreeRemovalsRepositoryMock} that starts as an empty
 * `worktree_removals` table (see `createBaseRepositoryMock`). `record` rejects until a test
 * stubs it, since an invented row would hide a missing stub. Provide it in place of
 * `WorktreeRemovalsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createWorktreeRemovalsRepositoryMock(): WorktreeRemovalsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      WorktreeRemoval,
      CreateModelInput<WorktreeRemoval>
    >('worktree_removals'),
    findLatestByUserAndPaths: vi.fn(async () => {
      return [];
    }),
    record: vi.fn(() => {
      return Promise.reject(
        new Error('worktree_removals.record is not stubbed in this test'),
      );
    }),
  };
}
