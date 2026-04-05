/**
 * @description GraphQL resolver for semantic search over plan/task (and optionally documentation) embeddings.
 * Accepts a text query and optional limit; returns ranked document chunks.
 * Also exposes getDocument(chunkId) and listSources() for MCP parity.
 */

import {
  embedQuery,
  getChunkById,
  getCortexPostgresConfig,
  listSources,
  runSemanticSearch,
} from '@openthrottle/ai-mcp/src/cortex-server';
import type { SemanticSearchChunk } from '@openthrottle/ai-mcp/src/cortex-server';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { SearchInput } from './search.input';
import {
  ListPlanSourceObject,
  ListSourceInfoObject,
  ListSourcesResultObject,
  SearchChunk,
  SearchResult,
} from './search.object';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

function mapChunkToObject(chunk: SemanticSearchChunk): SearchChunk {
  const obj = new SearchChunk();

  obj.content = chunk.content;
  obj.id = chunk.id;
  obj.planId = chunk.planId ?? null;
  obj.planTitle = chunk.planTitle ?? null;
  obj.similarity = chunk.similarity;
  obj.source = chunk.source;
  obj.sourcePath =
    chunk.source === 'documentation' ? (chunk.path ?? null) : null;
  obj.sourceRepo =
    chunk.source === 'documentation' ? (chunk.repo ?? null) : null;
  obj.sourceSha = chunk.source === 'documentation' ? (chunk.sha ?? null) : null;
  obj.taskId = chunk.taskId ?? null;
  obj.taskTitle = chunk.taskTitle ?? null;

  return obj;
}

@Resolver()
export class SearchResolver {
  @Query(() => SearchResult, {
    description: `Semantic search over plan and task embeddings. Embeds the query and returns ranked chunks. Requires Cortex Postgres and embedding (OPENAI_API_KEY or Ollama).`,
  })
  async search(
    @Args('input', { type: () => SearchInput }) input: SearchInput,
  ): Promise<SearchResult> {
    const config = getCortexPostgresConfig();
    if (!config) {
      return { chunks: [] };
    }

    const limit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT,
    );

    const query = input.query?.trim() ?? '';
    if (!query) {
      return { chunks: [] };
    }

    const embedding = await embedQuery(query);
    if (!embedding || embedding.length === 0) {
      return { chunks: [] };
    }

    const chunks = await runSemanticSearch(config, embedding, limit);
    const result = new SearchResult();

    result.chunks = chunks.map(mapChunkToObject);

    return result;
  }

  @Query(() => SearchChunk, {
    description: `Fetch a single document chunk by id (UUID from plan_embeddings, task_embeddings, or documentation_embeddings). Use after semantic search to read full chunk content.`,
    nullable: true,
  })
  async getDocument(
    @Args('id', { type: () => String }) id: string,
  ): Promise<SearchChunk | null> {
    const config = getCortexPostgresConfig();
    if (!config) {
      return null;
    }
    const chunk = await getChunkById(config, id);
    if (!chunk) {
      return null;
    }
    return mapChunkToObject(chunk);
  }

  @Query(() => ListSourcesResultObject, {
    description: `List knowledge-base sources (plan, task, documentation) and plan titles. Use to discover available collections and plans.`,
  })
  async listSources(): Promise<ListSourcesResultObject> {
    const config = getCortexPostgresConfig();
    if (!config) {
      return { plans: [], sources: [] };
    }

    const result = await listSources(config);
    const obj = new ListSourcesResultObject();

    obj.sources = result.sources.map((s) => {
      const o = new ListSourceInfoObject();

      o.name = s.name;
      o.description = s.description;

      return o;
    });

    obj.plans = result.plans.map((p) => {
      const o = new ListPlanSourceObject();

      o.id = p.id;
      o.title = p.title;

      return o;
    });

    return obj;
  }
}
