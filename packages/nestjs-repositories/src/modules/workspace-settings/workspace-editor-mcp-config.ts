/**
 * @description Builds MCP server entries for workspace editor configuration.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export interface McpServersJson {
  readonly mcpServers?: Record<string, Record<string, unknown>>;
}

/**
 * @description Deep-merges managed MCP server entries into existing config.
 */
export const mergeManagedMcpServers = (
  existing: McpServersJson,
  managed: Record<string, Record<string, unknown>>,
): McpServersJson => ({
  ...existing,
  mcpServers: {
    ...(existing.mcpServers ?? {}),
    ...managed,
  },
});

/**
 * @description Returns MCP server definitions OpenThrottle manages for a repository.
 * Reused by both the editor-config apply path and the conversation-stream chat
 * spawn path, so it is package-public API.
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
      description:
        'OpenThrottle (OT) plans knowledge base (GraphQL). Plans, tasks, notes, commit links, activity, output stream, semantic search, health.',
      env: {
        API_URL: options.apiBaseUrl,
        API_URL_INTERNAL: options.apiBaseUrl,
      },
    },
  };
};
