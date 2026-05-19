/**
 * @description Editor-specific config file paths relative to a linked repository root.
 */

import type { WorkspaceEditorId } from './workspace-editor-id';

export interface WorkspaceEditorConfigPaths {
  readonly mcpConfigRelativePath: string;
  readonly rulesDirectoryRelativePath: string;
}

const CURSOR_PATHS: WorkspaceEditorConfigPaths = {
  mcpConfigRelativePath: '.cursor/mcp.json',
  rulesDirectoryRelativePath: '.cursor/rules',
};

const VSCODE_PATHS: WorkspaceEditorConfigPaths = {
  mcpConfigRelativePath: '.vscode/mcp.json',
  rulesDirectoryRelativePath: '.vscode',
};

const EDITOR_CONFIG_PATHS: Record<
  WorkspaceEditorId,
  WorkspaceEditorConfigPaths
> = {
  cursor: CURSOR_PATHS,
  vscode: VSCODE_PATHS,
};

/**
 * @description Returns config paths for a supported workspace editor.
 */
export const getWorkspaceEditorConfigPaths = (
  editorId: WorkspaceEditorId,
): WorkspaceEditorConfigPaths => EDITOR_CONFIG_PATHS[editorId];

export const OPENTHROTTLE_MANIFEST_RELATIVE_PATH =
  '.openthrottle/workspace-editors.json';
