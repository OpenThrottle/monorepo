import { isRecord } from '@openthrottle/nodejs-utils';

import type { ChatMcpServer, ChatMessage } from '../types';

/**
 * @description Read an MCP server list off a `session` event's metadata. Keeps only
 * entries with a string `name` (a missing `status` reads `unknown`); undefined when the
 * value is not a list or nothing survives.
 */
export const parseMcpServers = (
  value: unknown,
): readonly ChatMcpServer[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const servers: ChatMcpServer[] = [];

  for (const entry of value) {
    if (
      isRecord(entry) &&
      typeof entry.name === 'string' &&
      entry.name !== ''
    ) {
      const status = typeof entry.status === 'string' ? entry.status : '';
      servers.push({
        name: entry.name,
        status: status === '' ? 'unknown' : status,
      });
    }
  }

  return servers.length > 0 ? servers : undefined;
};

/**
 * @description The MCP servers the CLI reported at its most recent session start (each
 * turn re-spawns the CLI, so the latest `session` event is the current truth), or an
 * empty list when no turn reported any.
 * @public
 */
export const deriveSessionMcpServers = (
  messages: readonly ChatMessage[],
): readonly ChatMcpServer[] => {
  let latest: readonly ChatMcpServer[] = [];

  for (const message of messages) {
    for (const event of message.events ?? []) {
      if (event.kind === 'session' && event.mcpServers !== undefined) {
        latest = event.mcpServers;
      }
    }
  }

  return latest;
};
