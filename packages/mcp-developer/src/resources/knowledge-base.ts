/**
 * @description Registers the knowledge-base chunk resource (read chunk by id via GraphQL getDocument).
 */

import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { GetDocumentDocument } from '../__generated__/graphql.js';
import { getAuthToken } from '../auth/get-auth-token.js';

type ChunkResult = {
  contents: Array<{ text: string; type: 'text'; uri: string }>;
};

export const knowledgeBaseChunkUriTemplate = 'knowledge-base://chunk/{id}';

export const knowledgeBaseChunkResourceName = 'knowledge-base-chunk';

export const knowledgeBaseChunkResourceDescription =
  'Read a single chunk by id (UUID). URI format: knowledge-base://chunk/{id}. Uses GraphQL getDocument only.';

export const knowledgeBaseChunkMimeType = 'text/plain';

/**
 * @description Reads a single chunk by id from the knowledge base via GraphQL getDocument query.
 */
export async function readKnowledgeBaseChunk(
  resourceUri: URL,
  variables: { id?: string | string[] },
): Promise<ChunkResult> {
  const uriStr = resourceUri.toString();
  let result: ChunkResult = {
    contents: [{ text: '', type: 'text' as const, uri: uriStr }],
  };

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
    const token = getAuthToken();
    const gqlResult = await executeGraphqlWithAuth(token, GetDocumentDocument, {
      id,
    });

    const chunk = gqlResult?.getDocument ?? null;
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
  } catch (err: unknown) {
    const isError = err instanceof Error;
    const message = isError ? err.message : String(err);

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

/**
 * @description Registers the knowledge-base-chunk resource. URI format: knowledge-base://chunk/{id}. Uses GraphQL getDocument only.
 */
export function registerKnowledgeBaseResource(server: McpServer): void {
  const knowledgeBaseChunkTemplate = new ResourceTemplate(
    knowledgeBaseChunkUriTemplate,
    { list: undefined },
  );

  server.registerResource(
    knowledgeBaseChunkResourceName,
    knowledgeBaseChunkTemplate,
    {
      description: knowledgeBaseChunkResourceDescription,
      mimeType: knowledgeBaseChunkMimeType,
    },
    (uri, variables, _extra) => readKnowledgeBaseChunk(uri, variables),
  );
}
