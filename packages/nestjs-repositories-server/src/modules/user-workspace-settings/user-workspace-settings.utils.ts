import { vi } from 'vitest';

import { userWorkspaceSettingsFactory } from './user-workspace-settings.factory.ts';
import type {
  UpdateUserWorkspaceProfileData,
  UserWorkspaceSettingsRepositoryMock,
} from './user-workspace-settings.types.ts';

/**
 * @description Builds a {@link UserWorkspaceSettingsRepositoryMock} that starts as an empty
 * `user_workspace_settings` table: `findByUserId` finds nothing, and the create/update methods
 * resolve an empty profile for the user with the patch applied. Provide it in place of
 * `UserWorkspaceSettingsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createUserWorkspaceSettingsRepositoryMock(): UserWorkspaceSettingsRepositoryMock {
  const applyProfile = async (
    userId: string,
    data: UpdateUserWorkspaceProfileData,
  ) => {
    return userWorkspaceSettingsFactory.build({
      ...(data.contactDisplayName !== undefined && {
        contactDisplayName: data.contactDisplayName,
      }),
      ...(data.contactEmail !== undefined && {
        contactEmail: data.contactEmail,
      }),
      ...(data.enabledEditors !== undefined && {
        enabledEditors: [...data.enabledEditors],
      }),
      userId,
    });
  };

  return {
    findByUserId: vi.fn(async () => {
      return null;
    }),
    getOrCreateForUser: vi.fn(async (userId: string) => {
      return userWorkspaceSettingsFactory.build({ userId });
    }),
    updateContactProfile: vi.fn(applyProfile),
    updateProfile: vi.fn(applyProfile),
  };
}
