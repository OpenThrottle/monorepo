/**
 * @description Registers search tools: semantic_search, get_document, list_sources.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig } from '../config.ts';
import type { SemanticSearchChunk } from '../cortex-client.ts';
import {
  getChunkById,
  listSources,
  runSemanticSearch,
} from '../cortex-client.ts';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.ts';
import { embedQuery } from '../embedding.ts';
import {
  getDocumentInputSchema,
  semanticSearchInputSchema,
} from '../schemas.ts';
import { configMissingSearchContent, invalidArgsContent } from './errors.ts';

/**
 * @description Human-readable label for a chunk, branched by source so documentation hits
 * (which have no plan/task title) show their path/repo instead of blank titles.
 */
function chunkLabel(chunk: SemanticSearchChunk): string {
  if (chunk.source === 'documentation') {
    const where = [chunk.repo, chunk.path].filter(Boolean).join(':');
    return where || chunk.documentationId || '(documentation)';
  }
  return [chunk.planTitle, chunk.taskTitle].filter(Boolean).join(' ');
}

/**
 * @description Maps a chunk to structuredContent, including documentation-source fields
 * (path/repo/sha/prNumber/documentationId/authors) that are otherwise dropped for doc hits.
 */
function chunkToStructured(
  chunk: SemanticSearchChunk,
): Record<string, unknown> {
  return {
    authors: chunk.authors,
    content: chunk.content,
    documentationId: chunk.documentationId,
    id: chunk.id,
    metadata: chunk.metadata,
    path: chunk.path,
    planId: chunk.planId,
    planTitle: chunk.planTitle,
    prNumber: chunk.prNumber,
    repo: chunk.repo,
    sha: chunk.sha,
    similarity: chunk.similarity,
    source: chunk.source,
    taskId: chunk.taskId,
    taskTitle: chunk.taskTitle,
  };
}

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'semantic_search',
    {
      description: `Search the plans knowledge base by meaning. Runs a vector similarity search over plan and task content in Cortex Postgres. Requires OPENAI_API_KEY for query embedding and POSTGRES_* (or POSTGRES_URL) for the database.`,
      inputSchema: {
        limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
        query: z.string().min(1),
      },
    },
    async (args: z.infer<typeof semanticSearchInputSchema>) => {
      const parsed = semanticSearchInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }
      const { query, limit = DEFAULT_LIMIT } = parsed.data;
      const config = getPostgresConfig();
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
        const chunks = await runSemanticSearch(embedding, limit);
        const textSummary = chunks
          .map(
            (c) =>
              `[${c.source}] ${chunkLabel(c)} (similarity: ${c.similarity.toFixed(3)})\n${c.content}`,
          )
          .join('\n\n---\n\n');
        return {
          content: [
            {
              text: textSummary || 'No matching chunks found.',
              type: 'text' as const,
            },
          ],
          structuredContent: {
            chunks: chunks.map(chunkToStructured),
          },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `Semantic search failed: ${message}`,
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
      description: `Fetch a single document chunk by id (UUID from plan_embeddings or task_embeddings). Use after semantic_search to read full chunk content.`,
      inputSchema: { id: z.uuid() },
    },
    async (args: z.infer<typeof getDocumentInputSchema>) => {
      const parsed = getDocumentInputSchema.safeParse(args);
      if (!parsed.success) {
        return invalidArgsContent(parsed.error.message);
      }

      try {
        const chunk = await getChunkById(parsed.data.id);
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
        const text = `[${chunk.source}] ${chunkLabel(chunk)}\n${chunk.content}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: chunkToStructured(chunk),
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

  server.registerTool(
    'list_sources',
    {
      description: `List knowledge-base sources (plan, task) and plan titles from Cortex. Use to discover available collections and plans.`,
    },
    async () => {
      const config = getPostgresConfig();
      if (!config) {
        return configMissingSearchContent();
      }
      try {
        const result = await listSources();
        const text =
          'Sources:\n' +
          result.sources
            .map((s) => `  - ${s.name}: ${s.description}`)
            .join('\n') +
          '\nPlans:\n' +
          result.plans.map((p) => `  - ${p.id}: ${p.title}`).join('\n');
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: {
            plans: result.plans,
            sources: result.sources,
          },
        };
      } catch (error) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);

        return {
          content: [
            {
              text: `list_sources failed: ${message}`,
              type: 'text' as const,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
