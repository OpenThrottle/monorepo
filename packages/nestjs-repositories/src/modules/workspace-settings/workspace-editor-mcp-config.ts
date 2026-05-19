/**
 * @description Builds MCP server entries for workspace editor configuration.
 */

import { existsSync } from 'fs';
import { join } from 'path';

export const MANAGED_MCP_SERVER_IDS = ['mcp-developer'] as const;

export type ManagedMcpServerId = (typeof MANAGED_MCP_SERVER_IDS)[number];

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
 */
export const buildManagedMcpServers = (options: {
  readonly apiBaseUrl: string;
  readonly repositoryRoot: string;
}): Record<string, Record<string, unknown>> => {
  const runScriptPath = join(
    options.repositoryRoot,
    'scripts/run-mcp-developer.sh',
  );

  if (!existsSync(runScriptPath)) {
    return {};
  }

  return {
    'mcp-developer': {
      args: ['./scripts/run-mcp-developer.sh'],
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
