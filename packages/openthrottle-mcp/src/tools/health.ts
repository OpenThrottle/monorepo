/**
 * @description Health tool handler + schema (`health`). Returns server health from GraphQL only (no direct Postgres). Registered via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

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

export const healthToolParameters = z.object({});

export const healthToolDescription = `Health check via GraphQL: returns server health (api, database, redis, websocket). No arguments. No direct Postgres; uses getServerHealth query only.`;

export async function healthToolHandler(
  _args: z.infer<typeof healthToolParameters>,
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
