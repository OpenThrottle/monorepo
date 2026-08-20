import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description One repository/editor pairing an apply-editor-configuration run will write to.
 * @public
 */
export interface WorkspaceEditorTarget {
  displayName: string;
  editor: WorkspaceEditorId;
  editorLabel: string;
  filesystemPath: string;
  id: string;
}

interface WorkspaceEditorTargetRepository {
  displayName: string;
  filesystemPath: string;
  id: string;
}

/**
 * @description Expands linked repositories x enabled editors into the exact set of pairings an
 * apply will touch, so the UI can state the blast radius before the user clicks Apply.
 * @public
 */
export const buildWorkspaceEditorTargets = (
  repositories: readonly WorkspaceEditorTargetRepository[],
  enabledEditors: readonly WorkspaceEditorId[],
): WorkspaceEditorTarget[] =>
  repositories.flatMap((repository) =>
    enabledEditors.map((editor) => ({
      displayName: repository.displayName,
      editor,
      editorLabel:
        WORKSPACE_EDITOR_OPTIONS.find((option) => option.value === editor)
          ?.label ?? editor,
      filesystemPath: repository.filesystemPath,
      id: repository.id,
    })),
  );
