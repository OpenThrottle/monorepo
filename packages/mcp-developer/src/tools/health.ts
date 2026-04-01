/**
 * @description Registers health tool: health. Returns server health from GraphQL only (no direct Postgres).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { GetServerHealthDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.js';
import { runTool } from '../utils/tool-result.js';

type HealthStructured = {
  serverHealth: {
    api: string;
    database: string;
    redis: string;
    websocket: string;
  };
};

const healthSchema = z.object({});

async function healthHandler(
  _args: z.infer<typeof healthSchema>,
): Promise<GenericResult<HealthStructured>> {
  return runTool<HealthStructured>('health', async () => {
    const result = await executeGraphql(GetServerHealthDocument, {});

    const serverHealth = result?.serverHealth;
    if (!serverHealth) {
      return null;
    }

    const { api, database, redis, websocket } = serverHealth;
    const text = [
      'Server health (GraphQL):',
      `  api: ${api}`,
      `  database: ${database}`,
      `  redis: ${redis}`,
      `  websocket: ${websocket}`,
    ].join('\n');

    return {
      structuredContent: { serverHealth },
      text,
    };
  });
}

/**
 * @description Registers the health tool. Returns API, database, Redis, and WebSocket status from getServerHealth GraphQL query (no direct Postgres).
 */
export function registerHealthTool(server: McpServer): void {
  server.registerTool(
    'health',
    {
      description: `Health check via GraphQL: returns server health (api, database, redis, websocket). No arguments. No direct Postgres; uses getServerHealth query only.`,
      inputSchema: healthSchema,
    },
    healthHandler,
  );
}
