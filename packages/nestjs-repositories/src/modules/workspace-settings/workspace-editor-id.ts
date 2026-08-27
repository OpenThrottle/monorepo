/**
 * @description Supported editor identifiers for workspace editor preference configuration.
 * Stored in `user_workspace_settings.enabled_editors` (JSONB string array).
 */

export const WORKSPACE_EDITOR_IDS = ['claude', 'cursor', 'vscode'] as const;

export type WorkspaceEditorId = (typeof WORKSPACE_EDITOR_IDS)[number];

/**
 * @description Returns true when `value` is a known workspace editor id.
 */
export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId =>
  WORKSPACE_EDITOR_IDS.some((editorId) => editorId === value);
