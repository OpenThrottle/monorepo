import { WORKSPACE_EDITOR_IDS } from './workspace-settings.constants.ts';
import type { WorkspaceEditorId } from './workspace-settings.types.ts';
const WORKSPACE_EDITOR_ID_SET: ReadonlySet<string> = new Set(
  WORKSPACE_EDITOR_IDS,
);

/**
 * @description Returns true when `value` is a known workspace editor id.
 */
export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId => {
  return WORKSPACE_EDITOR_ID_SET.has(value);
};
