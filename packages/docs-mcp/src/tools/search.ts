/**
 * @description Registers documentation search tools: documentation_semantic_search, get_document.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCortexPostgresConfig } from '../config.js';
import {
  getDocumentationChunkById,
  runDocumentationSemanticSearch,
} from '../cortex-client.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';
import { embedQuery } from '../embedding.js';
import { configMissingSearchContent, invalidArgsContent } from './errors.js';

const documentationSearchInputSchema = z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
  query: z.string().min(1),
});

const getDocumentInputSchema = z.object({ id: z.uuid() });

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'documentation_semantic_search',
    {
      description: `Search the documentation knowledge base by meaning. Runs a vector similarity search over documentation_embeddings in Cortex Postgres. Requires OPENAI_API_KEY for query embedding and POSTGRES_* (or DOCS_MCP_* or POSTGRES_URL) for the database.`,
      inputSchema: {
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        query: z.string().min(1),
      },
    },
    async (args: z.infer<typeof documentationSearchInputSchema>) => {
      const parsed = documentationSearchInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }
      const { query, limit = DEFAULT_LIMIT } = parsed.data;
      const config = getCortexPostgresConfig();
      if (!config) {
        return configMissingSearchContent();
      }
      const embedding = await embedQuery(query);
      if (!embedding) {
        return {
          content: [
            {
              text: 'Query embedding failed. Set OPENAI_API_KEY and ensure the API is reachable.',
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
      try {
        const chunks = await runDocumentationSemanticSearch(
          config,
          embedding,
          limit,
        );
        const textSummary = chunks
          .map(
            (c) =>
              `[${c.path}] repo=${c.repo} sha=${c.sha} (similarity: ${c.similarity.toFixed(3)})\n${c.content}`,
          )
          .join('\n\n---\n\n');
        return {
          content: [
            {
              text: textSummary || 'No matching documentation chunks found.',
              type: 'text' as const,
            },
          ],
          structuredContent: {
            chunks: chunks.map((c) => ({
              authors: c.authors,
              content: c.content,
              id: c.id,
              metadata: c.metadata,
              path: c.path,
              prNumber: c.prNumber,
              repo: c.repo,
              sha: c.sha,
              similarity: c.similarity,
            })),
          },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `Documentation semantic search failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'get_document',
    {
      description: `Fetch a single documentation chunk by id (UUID from documentation_embeddings). Use after documentation_semantic_search to read full chunk content.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof getDocumentInputSchema>) => {
      const parsed = getDocumentInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }
      const config = getCortexPostgresConfig();
      if (!config) {
        return configMissingSearchContent();
      }
      try {
        const chunk = await getDocumentationChunkById(config, parsed.data.id);
        if (!chunk) {
          return {
            content: [
              {
                text: `No document found for id: ${parsed.data.id}`,
                type: 'text' as const,
              },
            ],
            isError: true,
          };
        }
        const text = `[${chunk.path}] ${chunk.repo}@${chunk.sha}\n${chunk.content}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: {
            authors: chunk.authors,
            content: chunk.content,
            id: chunk.id,
            metadata: chunk.metadata,
            path: chunk.path,
            prNumber: chunk.prNumber,
            repo: chunk.repo,
            sha: chunk.sha,
          },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `get_document failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
