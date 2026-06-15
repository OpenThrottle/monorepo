/**
 * @description Registers the model-discovery tool: discover_local_models. Lists locally-running
 * OpenAI-compatible model servers (Ollama-primary) and their models via the discoverLocalModels
 * GraphQL query only — GraphQL-only boundary, no core import, no Nest bootstrap in this process.
 *
 * Caveat: returned baseUrls reflect the *server's* network vantage point. A Dockerized server
 * reaches a host-side Ollama via host.docker.internal, so a baseUrl may not be reachable verbatim
 * from this MCP process.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import { DiscoverLocalModelsDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.js';
import { runTool } from '../utils/tool-result.js';

type ModelEndpoint = {
  baseUrl: string;
  host: string;
  models: string[];
  port: number;
  provider: string | null;
};

type DiscoverLocalModelsStructured = {
  endpoints: ModelEndpoint[];
  scannedAt: string;
  scannedHosts: string[];
  totalCount: number;
};

export const discoverLocalModelsToolParameters = z.object({});

export const discoverLocalModelsToolDescription = `Discover locally-running OpenAI-compatible model servers (Ollama-primary; also vLLM, llama.cpp, SGLang, LM Studio) and the models they serve, via the discoverLocalModels GraphQL query. No arguments. Returns a cached snapshot (60s TTL). Caveat: baseUrls reflect the server's network vantage point (a Dockerized server reaches a host Ollama via host.docker.internal).`;

export async function discoverLocalModelsToolHandler(
  _args: z.infer<typeof discoverLocalModelsToolParameters>,
): Promise<GenericResult<DiscoverLocalModelsStructured>> {
  return runTool<DiscoverLocalModelsStructured>(
    'discover_local_models',
    async () => {
      const result = await executeGraphql(DiscoverLocalModelsDocument, {});
      const discovered = result?.discoverLocalModels;
      if (!discovered) {
        return null;
      }

      const endpoints: ModelEndpoint[] = discovered.endpoints.map(
        (endpoint) => ({
          baseUrl: endpoint.baseUrl,
          host: endpoint.host,
          models: [...endpoint.models],
          port: endpoint.port,
          provider: endpoint.provider ?? null,
        }),
      );

      const text =
        endpoints.length === 0
          ? `No local model servers found (scanned ${discovered.scannedHosts.length} host(s) at ${discovered.scannedAt}).`
          : [
              `Discovered ${discovered.totalCount} local model server(s) at ${discovered.scannedAt}:`,
              ...endpoints.map(
                (endpoint) =>
                  `  ${endpoint.baseUrl} [${endpoint.provider ?? 'openai-compatible'}] — ${
                    endpoint.models.length
                  } model(s): ${endpoint.models.join(', ') || '(none)'}`,
              ),
            ].join('\n');

      return {
        structuredContent: {
          endpoints,
          scannedAt: discovered.scannedAt,
          scannedHosts: [...discovered.scannedHosts],
          totalCount: discovered.totalCount,
        },
        text,
      };
    },
  );
}

/**
 * @description Registers the discover_local_models tool. Lists local OpenAI-compatible model
 * servers and their models from the discoverLocalModels GraphQL query (GraphQL-only).
 */
export function registerModelDiscoveryTool(server: McpServer): void {
  server.registerTool(
    'discover_local_models',
    {
      description: discoverLocalModelsToolDescription,
      inputSchema: discoverLocalModelsToolParameters,
    },
    discoverLocalModelsToolHandler,
  );
}
