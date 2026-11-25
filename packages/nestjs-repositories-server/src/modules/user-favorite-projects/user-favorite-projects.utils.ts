import { vi } from 'vitest';

import type { UserFavoriteProjectsRepositoryMock } from './user-favorite-projects.types.ts';

/**
 * @description Builds a {@link UserFavoriteProjectsRepositoryMock} that starts as an empty
 * `user_favorite_projects` table: nothing is starred, and `setProjectFavorite` is a no-op.
 * Provide it in place of `UserFavoriteProjectsRepository` and stub per test. Test-only:
 * imports `vitest`.
 * @public
 */
export function createUserFavoriteProjectsRepositoryMock(): UserFavoriteProjectsRepositoryMock {
  return {
    listFavoriteProjectIds: vi.fn(async () => {
      return [];
    }),
    setProjectFavorite: vi.fn(async () => {}),
  };
}
