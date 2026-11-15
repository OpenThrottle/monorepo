/**
 * @description GraphQL resolver for search over plans, tasks and documentation: hybrid (vector + full-text,
 * reciprocal rank fusion) by default, vector-only on request, full-text when the embedder cannot answer.
 * Also exposes getDocument(chunkId) and listSources() for MCP parity.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';
import type { SemanticSearchChunk } from '@openthrottle/node-client';
import {
  getChunkById,
  listSources,
  runLexicalSearch,
  runSemanticSearch,
} from '@openthrottle/node-client';
import { GraphQLError } from 'graphql';

import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { SearchInput } from './search.input.ts';
import {
  ListPlanSourceObject,
  ListSourceInfoObject,
  ListSourcesResultObject,
  SearchChunk,
  SearchResult,
} from './search.object.ts';
import type { RequestedSearchMode } from './search.types.ts';
import { searchHybrid } from './search.utils.ts';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
/** Each retriever over-fetches so fusion has candidates past the cut (2x the limit, at most 100). */
const HYBRID_CANDIDATE_FACTOR = 2;

/** The entity a chunk belongs to: several vector chunks of one plan, task or doc fuse into one result. */
function chunkEntityKey(chunk: SemanticSearchChunk): string {
  if (chunk.source === 'documentation') {
    return `documentation:${chunk.documentationId ?? chunk.id}`;
  }

  if (chunk.source === 'task') {
    return `task:${chunk.taskId ?? chunk.id}`;
  }

  return `plan:${chunk.planId ?? chunk.id}`;
}

function requestedMode(mode: string | null): RequestedSearchMode {
  if (mode === null || mode === 'hybrid') {
    return 'hybrid';
  }

  if (mode === 'semantic') {
    return 'semantic';
  }

  throw new GraphQLError(
    `Unknown search mode "${mode}"; expected "hybrid" or "semantic".`,
    { extensions: { code: 'BAD_USER_INPUT' } },
  );
}

function mapChunkToObject(
  chunk: SemanticSearchChunk,
  fusedScore: number | null,
): SearchChunk {
  const obj = new SearchChunk();

  obj.content = chunk.content;
  obj.fusedScore = fusedScore;
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

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver()
export class SearchResolver {
  constructor(private readonly embedder: EmbedderService) {}

  @Query(() => SearchResult, {
    description: `Search over plans, tasks and documentation. By default hybrid: vector similarity (the server embedder, local nomic-embed-text-v1.5 by default) and Postgres full-text search run together and merge by reciprocal rank fusion, so exact identifiers still surface. Pass mode "semantic" for the vector ranking alone. When the embedder is unavailable or nothing is embedded yet, answers with full-text search only — see mode and reason.`,
  })
  async search(
    @Args('input', { type: () => SearchInput }) input: SearchInput,
  ): Promise<SearchResult> {
    const limit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT,
    );

    const mode = requestedMode(input.mode ?? null);
    const query = input.query?.trim() ?? '';
    if (!query) {
      return { chunks: [], mode, reason: null };
    }

    const hybridCandidates = Math.min(
      limit * HYBRID_CANDIDATE_FACTOR,
      MAX_SEARCH_LIMIT * HYBRID_CANDIDATE_FACTOR,
    );
    const candidates = mode === 'hybrid' ? hybridCandidates : limit;
    const found = await searchHybrid({
      embed: () => {
        return this.embedder.embed([query], 'query');
      },
      key: chunkEntityKey,
      lexical: () => {
        return runLexicalSearch(query, candidates);
      },
      limit,
      mode,
      semantic: (vector, model) => {
        return runSemanticSearch(vector, candidates, model);
      },
    });
    const result = new SearchResult();

    result.chunks = found.chunks.map((ranked) => {
      return mapChunkToObject(ranked.chunk, ranked.fusedScore);
    });
    result.mode = found.mode;
    result.reason = found.reason;

    return result;
  }

  @Query(() => SearchChunk, {
    description: `Fetch a single document chunk by id (UUID from plan_embeddings, task_embeddings, or documentation_embeddings). Use after semantic search to read full chunk content.`,
    nullable: true,
  })
  async getDocument(
    @Args('id', { type: () => String }) id: string,
  ): Promise<SearchChunk | null> {
    const chunk = await getChunkById(id);
    if (!chunk) {
      return null;
    }
    return mapChunkToObject(chunk, null);
  }

  @Query(() => ListSourcesResultObject, {
    description: `List knowledge-base sources (plan, task, documentation) and plan titles. Use to discover available collections and plans.`,
  })
  async listSources(): Promise<ListSourcesResultObject> {
    const result = await listSources();
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
