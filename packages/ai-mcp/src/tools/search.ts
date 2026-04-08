/**
 * @description Registers search tools: semantic_search, get_document, list_sources.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPostgresConfig } from '../config.js';
import {
  getChunkById,
  listSources,
  runSemanticSearch,
} from '../cortex-client.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';
import { embedQuery } from '../embedding.js';
import {
  getDocumentInputSchema,
  semanticSearchInputSchema,
} from '../schemas.js';
import { configMissingSearchContent, invalidArgsContent } from './errors.js';

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
        const chunks = await runSemanticSearch(config, embedding, limit);
        const textSummary = chunks
          .map(
            (c) =>
              `[${c.source}] ${c.planTitle ?? ''} ${c.taskTitle ?? ''} (similarity: ${c.similarity.toFixed(3)})\n${c.content}`,
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
            chunks: chunks.map((c) => ({
              content: c.content,
              id: c.id,
              metadata: c.metadata,
              planId: c.planId,
              planTitle: c.planTitle,
              similarity: c.similarity,
              source: c.source,
              taskId: c.taskId,
              taskTitle: c.taskTitle,
            })),
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
      const config = getPostgresConfig();
      if (!config) {
        return configMissingSearchContent();
      }
      try {
        const chunk = await getChunkById(config, parsed.data.id);
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
        const text = `[${chunk.source}] ${chunk.planTitle ?? ''} ${chunk.taskTitle ?? ''}\n${chunk.content}`;
        return {
          content: [{ text, type: 'text' as const }],
          structuredContent: {
            content: chunk.content,
            id: chunk.id,
            metadata: chunk.metadata,
            planId: chunk.planId,
            planTitle: chunk.planTitle,
            source: chunk.source,
            taskId: chunk.taskId,
            taskTitle: chunk.taskTitle,
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
        const result = await listSources(config);
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
