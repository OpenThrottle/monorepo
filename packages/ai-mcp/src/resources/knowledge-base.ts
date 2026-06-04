/**
 * @description Registers the knowledge-base chunk resource (read chunk by id).
 */

import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPostgresConfig } from '../config.js';
import type { SemanticSearchChunk } from '../cortex-client.js';
import { getChunkById } from '../cortex-client.js';

type ChunkResult = {
  contents: Array<{ text: string; type: 'text'; uri: string }>;
};

async function readKnowledgeBaseChunk(
  resourceUri: URL,
  variables: { id?: string | string[] },
): Promise<ChunkResult> {
  const uriStr = resourceUri.toString();
  let result: ChunkResult = {
    contents: [{ text: '', type: 'text' as const, uri: uriStr }],
  };

  const config = getPostgresConfig();
  if (!config) {
    result = {
      contents: [
        {
          text: 'Cortex Postgres is not configured.',
          type: 'text' as const,
          uri: uriStr,
        },
      ],
    };
    return result;
  }

  const idRaw = variables.id;
  const id: string | undefined =
    typeof idRaw === 'string'
      ? idRaw
      : Array.isArray(idRaw)
        ? (idRaw[0] as string | undefined)
        : undefined;

  if (!id) {
    result = {
      contents: [
        { text: 'Missing id in URI.', type: 'text' as const, uri: uriStr },
      ],
    };
    return result;
  }

  try {
    const chunk = await getChunkById(id as string);
    if (!chunk) {
      result = {
        contents: [
          {
            text: `No chunk found for id: ${id}`,
            type: 'text' as const,
            uri: uriStr,
          },
        ],
      };
      return result;
    }

    const text = `[${(chunk as SemanticSearchChunk).source}] ${(chunk as SemanticSearchChunk).planTitle ?? ''} ${(chunk as SemanticSearchChunk).taskTitle ?? ''}\n${(chunk as SemanticSearchChunk).content}`;
    result = {
      contents: [{ text, type: 'text' as const, uri: uriStr }],
    };
    return result;
  } catch (err: unknown) {
    const isError = err instanceof Error;
    const message = isError ? (err as Error).message : String(err);
    result = {
      contents: [
        {
          text: `Error: ${message}`,
          type: 'text' as const,
          uri: uriStr,
        },
      ],
    };
  }
  return result;
}

export function registerKnowledgeBaseResource(server: McpServer): void {
  const knowledgeBaseChunkTemplate = new ResourceTemplate(
    'knowledge-base://chunk/{id}',
    { list: undefined },
  );

  server.registerResource(
    'knowledge-base-chunk',
    knowledgeBaseChunkTemplate,
    {
      description: `Read a single chunk by id (UUID). URI format: knowledge-base://chunk/{id}`,
      mimeType: 'text/plain',
    },
    (uri, variables, _extra) => readKnowledgeBaseChunk(uri, variables),
  );
}
