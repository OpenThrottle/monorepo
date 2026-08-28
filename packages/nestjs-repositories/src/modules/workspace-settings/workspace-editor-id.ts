/**
 * @description Supported editor identifiers for workspace editor preference configuration.
 * Stored in `user_workspace_settings.enabled_editors` (JSONB string array).
 *
 * This object is the server-side source of truth. Downstream maps are
 * `Record<WorkspaceEditorId, …>` so adding an editor fails typecheck until every
 * shape has a matching key. Do not re-list these ids as a `Set` or `string[]`.
 */

export const WORKSPACE_EDITORS = {
  claude: 'claude',
  cursor: 'cursor',
  vscode: 'vscode',
} as const;

export type WorkspaceEditorId =
  (typeof WORKSPACE_EDITORS)[keyof typeof WORKSPACE_EDITORS];

export const WORKSPACE_EDITOR_IDS: readonly WorkspaceEditorId[] =
  Object.values(WORKSPACE_EDITORS);

const WORKSPACE_EDITOR_ID_SET: ReadonlySet<string> = new Set(
  WORKSPACE_EDITOR_IDS,
);

/**
 * @description Returns true when `value` is a known workspace editor id.
 */
export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId => WORKSPACE_EDITOR_ID_SET.has(value);
