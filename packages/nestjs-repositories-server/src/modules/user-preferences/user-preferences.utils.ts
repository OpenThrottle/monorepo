import { vi } from 'vitest';

import { emptyUserPreferences } from './preferences-patch/preferences-patch.utils.ts';
import type { UserPreferencesRepositoryMock } from './user-preferences.types.ts';

/**
 * @description Builds a {@link UserPreferencesRepositoryMock} that starts as an empty
 * `user_preferences` table: `getForUser` resolves the all-NULL preferences for the user and
 * `update` resolves success with those same empty preferences. Provide it in place of
 * `UserPreferencesRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createUserPreferencesRepositoryMock(): UserPreferencesRepositoryMock {
  return {
    getForUser: vi.fn(async (userId: string) => {
      return emptyUserPreferences(userId);
    }),
    update: vi.fn(async (userId: string) => {
      return { ok: true as const, preferences: emptyUserPreferences(userId) };
    }),
  };
}
