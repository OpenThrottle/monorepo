import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description One repository/editor application returned by applyWorkspaceEditorConfiguration,
 * resolved against the linked repositories so the UI can name the repository it wrote to.
 * @public
 */
export interface WorkspaceApplyResult {
  displayName: string;
  editorLabel: string;
  filesWritten: readonly string[];
  filesystemPath: string;
  repositoryId: string;
  warnings: readonly string[];
}

interface WorkspaceApplyApplication {
  editor: WorkspaceEditorId;
  filesWritten: readonly string[];
  filesystemPath: string;
  repositoryId: string;
  warnings: readonly string[];
}

interface WorkspaceApplyRepository {
  displayName: string;
  id: string;
}

/**
 * @description Resolves each application's repository display name and editor label, falling back
 * to the filesystem path / raw editor id when the repository is no longer linked.
 * @public
 */
export const buildWorkspaceApplyResults = (
  applications: readonly WorkspaceApplyApplication[],
  repositories: readonly WorkspaceApplyRepository[],
): WorkspaceApplyResult[] =>
  applications.map((application) => ({
    displayName:
      repositories.find(
        (repository) => repository.id === application.repositoryId,
      )?.displayName ?? application.filesystemPath,
    editorLabel:
      WORKSPACE_EDITOR_OPTIONS.find(
        (option) => option.value === application.editor,
      )?.label ?? application.editor,
    filesWritten: application.filesWritten,
    filesystemPath: application.filesystemPath,
    repositoryId: application.repositoryId,
    warnings: application.warnings,
  }));
