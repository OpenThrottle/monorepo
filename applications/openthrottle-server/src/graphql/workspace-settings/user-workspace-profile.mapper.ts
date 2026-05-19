/**
 * @description Maps persistence {@link UserWorkspaceSettings} to GraphQL profile object.
 */

import type { UserWorkspaceSettings } from '@openthrottle/nestjs-repositories';
import type { WorkspaceEditorId } from '@openthrottle/nestjs-repositories';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';
import type { UserWorkspaceProfileObject } from './user-workspace-profile.object';

const EDITOR_ID_TO_ENUM: Record<WorkspaceEditorId, WorkspaceEditorIdEnum> = {
  cursor: WorkspaceEditorIdEnum.CURSOR,
  vscode: WorkspaceEditorIdEnum.VSCODE,
};

/**
 * @description Converts stored editor ids to GraphQL enum values.
 */
export const toUserWorkspaceProfileObject = (
  settings: UserWorkspaceSettings,
): UserWorkspaceProfileObject => ({
  contactDisplayName: settings.contactDisplayName,
  contactEmail: settings.contactEmail,
  createdAt: settings.createdAt,
  enabledEditors: settings.enabledEditors.map((id) => EDITOR_ID_TO_ENUM[id]),
  updatedAt: settings.updatedAt,
  userId: settings.userId,
});
