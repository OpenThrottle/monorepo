/**
 * @description Registers the knowledge-base chunk resource (read chunk by id).
 */

import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPostgresConfig } from '../config.ts';
import { getChunkById } from '@openthrottle/node-client';

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
        ? idRaw[0]
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
    const chunk = await getChunkById(id);
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

    const text = `[${chunk.source}] ${chunk.planTitle ?? ''} ${chunk.taskTitle ?? ''}\n${chunk.content}`;
    result = {
      contents: [{ text, type: 'text' as const, uri: uriStr }],
    };
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
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
