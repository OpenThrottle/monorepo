/**
 * @description Search tool handlers + schemas: semantic_search, get_document, list_sources. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 * All backend communication via GraphQL only (search, getDocument, listSources queries).
 */

import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type GetDocumentQuery,
  type ListSourcesQuery,
  type SearchQuery,
  GetDocumentDocument,
  ListSourcesDocument,
  SearchDocument,
} from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

const SEARCH_DEFAULT_LIMIT = 20;
const SEARCH_MAX_LIMIT = 50;

type GetDocumentResult = GenericResult<{
  chunk: GetDocumentQuery['getDocument'];
}>;

type ListSourcesResult = GenericResult<{
  plans: ListSourcesQuery['listSources']['plans'];
  sources: ListSourcesQuery['listSources']['sources'];
}>;

type SemanticSearchResult = GenericResult<{
  chunks: SearchQuery['search']['chunks'];
}>;

export const getDocumentToolParameters = z.object({ id: z.string().uuid() });
export const listSourcesToolParameters = z.object({});
export const semanticSearchToolParameters = z.object({
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).optional(),
  query: z.string().min(1),
});

export const getDocumentToolDescription = `Fetch a single document chunk by id (UUID from plan_embeddings or task_embeddings). Use after semantic_search to read full chunk content.`;

export const listSourcesToolDescription = `List knowledge-base sources (plan, task, documentation) and plan titles. Use to discover available collections and plans.`;

export const semanticSearchToolDescription = `Search the plans knowledge base by meaning. Runs a vector similarity search over plan and task content via GraphQL. Requires OPENAI_API_KEY or Ollama on the server for query embedding.`;

export async function getDocumentToolHandler(
  args: z.infer<typeof getDocumentToolParameters>,
): Promise<GetDocumentResult> {
  const parsed = getDocumentToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ chunk: GetDocumentQuery['getDocument'] }>(
    'get_document',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, GetDocumentDocument, {
        id: parsed.data.id,
      });

      const chunk = result?.getDocument ?? null;
      if (!chunk) {
        throw new Error(`No document found for id: ${parsed.data.id}`);
      }

      const text = `[${chunk.source}] ${chunk.planTitle ?? ''} ${chunk.taskTitle ?? ''}\n${chunk.content}`;
      return {
        structuredContent: { chunk },
        text,
      };
    },
  );
}

export async function listSourcesToolHandler(
  _args: z.infer<typeof listSourcesToolParameters>,
): Promise<ListSourcesResult> {
  return runTool<{
    plans: ListSourcesQuery['listSources']['plans'];
    sources: ListSourcesQuery['listSources']['sources'];
  }>('list_sources', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, ListSourcesDocument, {});

    const listSourcesResult = result?.listSources;
    if (!listSourcesResult) {
      return null;
    }

    const { sources, plans } = listSourcesResult;
    const text =
      'Sources:\n' +
      sources.map((s) => `  - ${s.name}: ${s.description}`).join('\n') +
      '\nPlans:\n' +
      plans.map((p) => `  - ${p.id}: ${p.title}`).join('\n');

    return {
      structuredContent: { plans, sources },
      text,
    };
  });
}

export async function semanticSearchToolHandler(
  args: z.infer<typeof semanticSearchToolParameters>,
): Promise<SemanticSearchResult> {
  const parsed = semanticSearchToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const limit = Math.min(
    parsed.data.limit ?? SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LIMIT,
  );
  const query = parsed.data.query?.trim() ?? '';
  if (!query) {
    return invalidArgsContent('query must be a non-empty string');
  }

  return runTool<{ chunks: SearchQuery['search']['chunks'] }>(
    'semantic_search',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(token, SearchDocument, {
        input: { limit, query },
      });

      const chunks = result?.search?.chunks ?? [];
      const textSummary = chunks
        .map(
          (c) =>
            `[${c.source}] ${c.planTitle ?? ''} ${c.taskTitle ?? ''} (similarity: ${c.similarity.toFixed(3)})\n${c.content}`,
        )
        .join('\n\n---\n\n');

      return {
        structuredContent: { chunks },
        text: textSummary || 'No matching chunks found.',
      };
    },
  );
}
