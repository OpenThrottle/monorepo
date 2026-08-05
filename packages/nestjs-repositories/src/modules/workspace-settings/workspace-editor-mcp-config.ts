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
 *
 * This is the RUNTIME equivalent of the human-facing Cursor template
 * `.cursor/mcp.json.example` — the documented single source of truth for the
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
      description:
        'OpenThrottle (OT) plans knowledge base (GraphQL). Plans, tasks, notes, commit links, activity, output stream, semantic search, health.',
      env: {
        API_URL: options.apiBaseUrl,
        API_URL_INTERNAL: options.apiBaseUrl,
      },
    },
  };
};
