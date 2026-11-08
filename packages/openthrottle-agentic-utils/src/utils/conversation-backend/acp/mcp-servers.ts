/**
 * Converts the run's managed MCP servers (canonical `.mcp.json` shape, built
 * server-side by `buildManagedMcpServers`) into ACP `McpServer` entries for
 * `session/new` / `session/load`. This is the one portable MCP injection path:
 * it replaces each CLI's own config mechanism (claude `--mcp-config`, opencode
 * `OPENCODE_CONFIG`, gemini's `.gemini/settings.json`).
 */

import type { McpServer } from '@agentclientprotocol/sdk';
import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationBackendRun } from '../types.ts';

/** String entries of an untyped record, dropping non-string values. */
function stringEntries(value: unknown): Array<[string, string]> {
  if (!isRecord(value)) {
    return [];
  }

  const entries: Array<[string, string]> = [];
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      entries.push([key, entry]);
    }
  }

  return entries;
}

/** String items of an untyped array, dropping non-strings. */
function stringItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

/** One canonical entry → an ACP server, or null when it is neither stdio nor http. */
function toAcpMcpServer(
  name: string,
  config: Readonly<Record<string, unknown>>,
  mcpEnv: Readonly<Record<string, string>> | undefined,
): McpServer | null {
  const { command, url } = config;

  if (typeof command === 'string' && command !== '') {
    // The run's mcpEnv carries the OT MCP auth token and API URLs. An ACP agent
    // spawns stdio servers with the env listed here, so it is merged in rather
    // than trusted to leak through the agent's own environment.
    const env = new Map<string, string>(Object.entries(mcpEnv ?? {}));
    for (const [key, value] of stringEntries(config['env'])) {
      env.set(key, value);
    }

    return {
      args: stringItems(config['args']),
      command,
      env: [...env].map(([envName, value]) => ({ name: envName, value })),
      name,
    };
  }

  if (typeof url === 'string' && url !== '') {
    return {
      headers: stringEntries(config['headers']).map(([header, value]) => ({
        name: header,
        value,
      })),
      name,
      type: 'http',
      url,
    };
  }

  return null;
}

/**
 * Build the ACP `mcpServers` list for a run. Empty when the run injects none.
 *
 * @public
 */
export function toAcpMcpServers(
  run: Pick<ConversationBackendRun, 'mcpEnv' | 'mcpServers'>,
): McpServer[] {
  const servers: McpServer[] = [];
  for (const [name, config] of Object.entries(run.mcpServers ?? {})) {
    const server = toAcpMcpServer(name, config, run.mcpEnv);
    if (server !== null) {
      servers.push(server);
    }
  }

  return servers;
}
