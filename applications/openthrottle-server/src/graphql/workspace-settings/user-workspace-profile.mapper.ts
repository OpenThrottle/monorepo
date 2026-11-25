/**
 * @description Maps persistence {@link UserWorkspaceSettings} to GraphQL profile object.
 */

import type {
  UserWorkspaceSettings,
  WorkspaceEditorId,
} from '@openthrottle/nestjs-repositories-server';

import type { UserWorkspaceProfileObject } from './user-workspace-profile.object.ts';
import type { WorkspaceEditorIdValue } from './workspace-editor-id.enum.ts';
import { WORKSPACE_EDITOR_ID } from './workspace-editor-id.enum.ts';

const EDITOR_ID_TO_ENUM: Record<WorkspaceEditorId, WorkspaceEditorIdValue> = {
  claude: WORKSPACE_EDITOR_ID.CLAUDE,
  cursor: WORKSPACE_EDITOR_ID.CURSOR,
  vscode: WORKSPACE_EDITOR_ID.VSCODE,
};

/**
 * @description Converts a stored editor id to the GraphQL enum.
 */
export const toWorkspaceEditorIdEnum = (
  editorId: WorkspaceEditorId,
): WorkspaceEditorIdValue => {
  return EDITOR_ID_TO_ENUM[editorId];
};

/**
 * @description Converts stored editor ids to GraphQL enum values.
 */
export const toUserWorkspaceProfileObject = (
  settings: UserWorkspaceSettings,
): UserWorkspaceProfileObject => {
  return {
    contactDisplayName: settings.contactDisplayName,
    contactEmail: settings.contactEmail,
    createdAt: settings.createdAt,
    enabledEditors: settings.enabledEditors.map(
      (id: WorkspaceEditorId) => EDITOR_ID_TO_ENUM[id],
    ),
    updatedAt: settings.updatedAt,
    userId: settings.userId,
  };
};
