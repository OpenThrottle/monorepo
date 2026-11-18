import type { WorkspaceEditorId } from './user-workspace-settings.types.ts';

/**
 * @description Supported editor identifiers for workspace editor preference configuration.
 * Stored in `user_workspace_settings.enabled_editors` (JSONB string array).
 *
 * This object is the server-side source of truth. Downstream maps are
 * `Record<WorkspaceEditorId, …>` so adding an editor fails typecheck until every
 * shape has a matching key. Do not re-list these ids as a `Set` or `string[]`.
 * @public
 */
export const WORKSPACE_EDITORS = {
  claude: 'claude',
  cursor: 'cursor',
  vscode: 'vscode',
} as const;

/**
 * @description Every {@link WORKSPACE_EDITORS} id.
 * @public
 */
export const WORKSPACE_EDITOR_IDS: readonly WorkspaceEditorId[] =
  Object.values(WORKSPACE_EDITORS);
