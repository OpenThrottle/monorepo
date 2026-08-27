/**
 * @description Editor-specific config file paths relative to a linked repository root.
 */

import type { WorkspaceEditorId } from './workspace-editor-id';

interface WorkspaceEditorConfigPaths {
  readonly mcpConfigRelativePath: string;
  readonly rulesDirectoryRelativePath: string;
}

// Claude Code reads project-scoped MCP servers from the repo-root `.mcp.json`
// (NOT `.claude/mcp.json`); `.claude/` holds settings, skills and commands.
const CLAUDE_PATHS: WorkspaceEditorConfigPaths = {
  mcpConfigRelativePath: '.mcp.json',
  rulesDirectoryRelativePath: '.claude',
};

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
  claude: CLAUDE_PATHS,
  cursor: CURSOR_PATHS,
  vscode: VSCODE_PATHS,
};

/**
 * @description Returns config paths for a supported workspace editor.
 */
export const getWorkspaceEditorConfigPaths = (
  editorId: WorkspaceEditorId,
): WorkspaceEditorConfigPaths => {
  return EDITOR_CONFIG_PATHS[editorId];
};

export const OPENTHROTTLE_MANIFEST_RELATIVE_PATH = `.openthrottle/workspace-editors.json`;
