/**
 * @description Registers health check tool: health. Returns server ok and optionally Cortex DB reachable.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig } from '../config.js';
import { getOrCreateDataSource, runQuery } from '../data-source.js';

type HealthStructured = {
  cortex?: 'not_configured' | 'reachable' | 'unreachable';
  message?: string;
  server: 'ok';
};

async function handleHealth(args: { checkDb?: boolean }): Promise<{
  content: { text: string; type: 'text' }[];
  isError?: boolean;
  structuredContent?: { result: HealthStructured };
}> {
  const checkDb = args.checkDb === true;
  const result: HealthStructured = { server: 'ok' };

  if (!checkDb) {
    const text = `Server OK. Cortex DB check skipped (checkDb not set or false).`;

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { result },
    };
  }

  const config = getPostgresConfig();
  if (!config) {
    result.cortex = 'not_configured';
    result.message = 'Cortex Postgres is not configured.';

    const text = `Server OK. Cortex: ${result.cortex}. ${result.message}`;

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { result },
    };
  }

  try {
    const ds = await getOrCreateDataSource(config);
    await runQuery(ds, 'SELECT 1');

    result.cortex = 'reachable';
    result.message = 'Cortex Postgres is reachable.';

    const text = `Server OK. Cortex: ${result.cortex}. ${result.message}`;

    return {
      content: [{ text, type: 'text' as const }],
      structuredContent: { result },
    };
  } catch (error: unknown) {
    const isError = error instanceof Error;
    const isString = typeof error === 'string';
    const message = isError
      ? error.message
      : isString
        ? error
        : 'Unknown error';

    result.cortex = 'unreachable';
    result.message = message;

    const text = `Server OK. Cortex: ${result.cortex}. ${result.message}`;

    return {
      content: [{ text, type: 'text' as const }],
      isError: true,
      structuredContent: { result },
    };
  }
}

/**
 * @description Registers the health tool. Call to verify ai-mcp server and optionally Cortex DB are reachable.
 */
export function registerHealthTool(server: McpServer): void {
  server.registerTool(
    'health',
    {
      description: `Health check: returns server ok and optionally whether Cortex Postgres is reachable. Set checkDb to true to verify Cortex DB; default is server-only (fast).`,
      inputSchema: {
        checkDb: z.boolean().optional(),
      },
    },
    handleHealth,
  );
}
