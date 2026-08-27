/**
 * @description Type guard narrowing an arbitrary submitted value to a known
 * workspace editor id. Used by the workspace settings action to reject editor
 * ids this client does not recognize.
 */

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId =>
  WORKSPACE_EDITOR_OPTIONS.some((opt) => opt.value === value);
