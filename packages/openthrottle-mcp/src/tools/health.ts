/**
 * @description Health tool handler + schema (`health`). Returns server health from GraphQL only (no direct Postgres). Registered via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type {
  EmbeddingsHealthFragment,
  ServerHealthWithEmbeddingsFragment,
} from '../__generated__/graphql.js';
import { GetServerHealthWithEmbeddingsDocument } from '../__generated__/graphql.js';
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
  serverHealth: ServerHealthWithEmbeddingsFragment;
  toolsets: ToolsetReport;
};

/**
 * @description Human-readable embeddings lines: status, model, backlog, then one coverage line
 * per table — so "semantic search is down" is visible from `health`, not from an empty search.
 */
const describeEmbeddings = (
  embeddings: EmbeddingsHealthFragment | null | undefined,
): string[] => {
  if (!embeddings) {
    return [];
  }

  const model = embeddings.model
    ? `${embeddings.provider} ${embeddings.model}, ${embeddings.dims ?? '?'} dims`
    : embeddings.provider;
  const lines = [
    `  embeddings: ${embeddings.status} (${model}) — queue ${embeddings.queueDepth ?? 'unknown'}, stale ${embeddings.staleCount}`,
    ...embeddings.coverage.map((table) => {
      return `    ${table.table}: ${table.embedded}/${table.total}${table.stale > 0 ? ` (${table.stale} stale)` : ''}`;
    }),
  ];

  if (embeddings.detail) {
    lines.push(`    detail: ${embeddings.detail}`);
  }

  return lines;
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

export const healthToolDescription = `Health check via GraphQL: server health (api, database, redis, websocket, embeddings coverage) and which MCP toolsets are loaded. No arguments.`;

export async function healthToolHandler(
  _args: z.infer<typeof healthToolParameters>,
): Promise<GenericResult<HealthStructured>> {
  return runTool<HealthStructured>('health', async () => {
    const result = await executeGraphql(
      GetServerHealthWithEmbeddingsDocument,
      {},
    );

    const serverHealth = result?.serverHealth;
    if (!serverHealth) {
      return null;
    }

    const { api, database, embeddings, redis, websocket } = serverHealth;
    const toolsets = reportToolsets();
    const off = toolsets.disabled.map((t) => `${t.name} (${t.description})`);
    const lines = [
      'Server health (GraphQL):',
      `  api: ${api}`,
      `  database: ${database}`,
      `  redis: ${redis}`,
      `  websocket: ${websocket}`,
      ...describeEmbeddings(embeddings),
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
