import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description One enabled editor an apply-editor-configuration run configures, with its
 * human-readable label.
 * @public
 */
export interface WorkspaceEditorTargetEditor {
  id: WorkspaceEditorId;
  label: string;
}

/**
 * @description One repository an apply-editor-configuration run will write to, carrying every
 * enabled editor it is configured for.
 * @public
 */
export interface WorkspaceEditorTargetGroup {
  displayName: string;
  editors: readonly WorkspaceEditorTargetEditor[];
  filesystemPath: string;
  id: string;
}

interface WorkspaceEditorTargetRepository {
  displayName: string;
  filesystemPath: string;
  id: string;
}

/**
 * @description Groups linked repositories with the enabled editors an apply will configure —
 * one entry per repository — so the UI can state the blast radius before the user clicks
 * Apply. Returns nothing when either side is empty, because an apply would be a no-op.
 * @public
 */
export const buildWorkspaceEditorTargetGroups = (
  repositories: readonly WorkspaceEditorTargetRepository[],
  enabledEditors: readonly WorkspaceEditorId[],
): WorkspaceEditorTargetGroup[] => {
  if (enabledEditors.length === 0) {
    return [];
  }

  const editors = enabledEditors.map((editor) => ({
    id: editor,
    label:
      WORKSPACE_EDITOR_OPTIONS.find((option) => option.value === editor)
        ?.label ?? editor,
  }));

  return repositories.map((repository) => ({
    displayName: repository.displayName,
    editors,
    filesystemPath: repository.filesystemPath,
    id: repository.id,
  }));
};
