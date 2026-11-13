/**
 * @description Health tool handler + schema (`health`). Returns server health from GraphQL only (no direct Postgres). Registered via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import { GetServerHealthDocument } from '../__generated__/graphql.js';
import type { ToolsetName } from '../config/toolsets.ts';
import {
  disabledToolsets,
  getActiveToolsets,
  TOOLSET_DESCRIPTIONS,
  TOOLSET_NAMES,
  TOOLSETS_ENV,
} from '../config/toolsets.ts';
import type { GenericResult } from '../types/index.ts';
import { runTool } from '../utils/runTool.ts';

type ToolsetReport = {
  disabled: { description: string; name: ToolsetName }[];
  enableWith: string;
  enabled: ToolsetName[];
};

type HealthStructured = {
  serverHealth: {
    api: string;
    database: string;
    redis: string;
    websocket: string;
  };
  toolsets: ToolsetReport;
};

/**
 * @description Which toolsets this process serves, and how to turn on the rest. Reported by `health`
 * because a disabled tool is absent from `tools/list`, so a client has no other way to learn it exists.
 */
const reportToolsets = (): ToolsetReport => {
  const active = getActiveToolsets();

  return {
    disabled: disabledToolsets(active).map((name) => ({
      description: TOOLSET_DESCRIPTIONS[name],
      name,
    })),
    enableWith: `${TOOLSETS_ENV}=<names|all> in the MCP server's env, or --toolsets=<names|all>`,
    enabled: TOOLSET_NAMES.filter((name) => active.has(name)),
  };
};

export const healthToolParameters = z.object({}).strict();

export const healthToolDescription = `Health check via GraphQL: returns server health (api, database, redis, websocket) and which MCP toolsets are loaded. No arguments. No direct Postgres; uses getServerHealth query only.`;

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
    const toolsets = reportToolsets();
    const off = toolsets.disabled.map((t) => `${t.name} (${t.description})`);
    const lines = [
      'Server health (GraphQL):',
      `  api: ${api}`,
      `  database: ${database}`,
      `  redis: ${redis}`,
      `  websocket: ${websocket}`,
      `MCP toolsets loaded: ${toolsets.enabled.join(', ')}`,
    ];
    if (off.length > 0) {
      lines.push(`Not loaded: ${off.join('; ')}. Enable with ${toolsets.enableWith}.`); // prettier-ignore
    }

    return {
      structuredContent: { serverHealth, toolsets },
      text: lines.join('\n'),
    };
  });
}
