import type { WorkspaceEditorId } from '@openthrottle/nestjs-repositories-server';
import { existsSync } from 'fs';
import { join } from 'path';

import type {
  McpServersJson,
  WorkspaceEditorConfigPaths,
} from './workspace-editor-config.types.ts';

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

// Exhaustive over WorkspaceEditorId: adding an editor fails to compile here
// until its config paths are declared, rather than resolving to undefined.
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

/**
 * @description Deep-merges managed MCP server entries into existing config.
 */
export const mergeManagedMcpServers = (
  existing: McpServersJson,
  managed: Record<string, Record<string, unknown>>,
): McpServersJson => {
  return {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers ?? {}),
      ...managed,
    },
  };
};

/**
 * @description Returns MCP server definitions OpenThrottle manages for a repository.
 * Reused by both the editor-config apply path and the conversation-stream chat
 * spawn path, so it is package-public API.
 *
 * This is the RUNTIME equivalent of the human-facing Cursor template
 * `.cursor/mcp.json` — the documented single source of truth for the
 * `openthrottle-mcp` entry (see docs/openthrottle/mcp-registration.md
 * § Template structure). The two are deliberately NOT unified through a shared
 * constant: this builder is dynamic (per-repository `apiBaseUrl` /
 * `repositoryRoot`) and intentionally stays THINNER than the example — it emits
 * no `OPENTHROTTLE_MCP_AUTH_TOKEN`, because the token is resolved at launch by
 * `run-openthrottle-mcp.sh` and must never be written into a user's checkout.
 * Keep `command` / `args` / `description` here in sync with the example by
 * review; do not read the example file at runtime (that would couple runtime
 * code to a docs template).
 * @public
 */
export const buildManagedMcpServers = (options: {
  readonly apiBaseUrl: string;
  readonly repositoryRoot: string;
}): Record<string, Record<string, unknown>> => {
  const runScriptPath = join(
    options.repositoryRoot,
    'scripts/run-openthrottle-mcp.sh',
  );

  if (!existsSync(runScriptPath)) {
    return {};
  }

  return {
    'openthrottle-mcp': {
      args: ['./scripts/run-openthrottle-mcp.sh'],
      command: 'bash',
      description: `OpenThrottle (OT) plans knowledge base (GraphQL). Plans, tasks, notes, commit links, activity, output stream, semantic search, health.`,
      env: {
        API_URL: options.apiBaseUrl,
        API_URL_INTERNAL: options.apiBaseUrl,
      },
    },
  };
};
