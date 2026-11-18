import type { Mock } from 'vitest';

import type { WORKSPACE_EDITORS } from './user-workspace-settings.constants.ts';
import type { UserWorkspaceSettings } from './user-workspace-settings.entity.ts';
import type { UserWorkspaceSettingsRepository } from './user-workspace-settings.repository.ts';

/**
 * @description One of the {@link WORKSPACE_EDITORS} ids.
 * @public
 */
export type WorkspaceEditorId =
  (typeof WORKSPACE_EDITORS)[keyof typeof WORKSPACE_EDITORS];

/**
 * @description A user's workspace settings as the rest of the server sees them.
 * @public
 */
export interface UserWorkspaceSettingsData {
  readonly contactDisplayName: string | null;
  readonly contactEmail: string | null;
  readonly enabledEditors: readonly WorkspaceEditorId[];
  readonly userId: string;
}

/**
 * @description Scalar/column fields of {@link UserWorkspaceSettings} (no relations).
 * @public
 */
export type UserWorkspaceSettingsRow = Pick<
  UserWorkspaceSettings,
  | 'contactDisplayName'
  | 'contactEmail'
  | 'createdAt'
  | 'enabledEditors'
  | 'updatedAt'
  | 'userId'
>;

/**
 * @description A profile patch. Optional on purpose: an absent (`undefined`) key leaves that
 * field unchanged.
 * @public
 */
export interface UpdateUserWorkspaceProfileData {
  readonly contactDisplayName?: string | null;
  readonly contactEmail?: string | null;
  readonly enabledEditors?: readonly WorkspaceEditorId[];
}

/**
 * @description Every public method of {@link UserWorkspaceSettingsRepository}, so the mock cannot
 * drift from it.
 * @public
 */
export type UserWorkspaceSettingsRepositoryMethod =
  | 'findByUserId'
  | 'getOrCreateForUser'
  | 'updateContactProfile'
  | 'updateProfile';

/**
 * @description A {@link UserWorkspaceSettingsRepository} mock: one `Mock` per method.
 * @public
 */
export type UserWorkspaceSettingsRepositoryMock = {
  readonly [TMethod in UserWorkspaceSettingsRepositoryMethod]: Mock<
    UserWorkspaceSettingsRepository[TMethod]
  >;
};
