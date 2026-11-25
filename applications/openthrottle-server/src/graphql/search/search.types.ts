/**
 * @description Types shared by the semantic-search resolvers (OT plans 165e86ef, e5397271).
 */

import type { EmbedResult } from '@openthrottle/node-client';

/**
 * @description How a search result was ranked: `hybrid` (vector and full-text merged by reciprocal rank
 * fusion), `semantic` (vector only) or `lexical` (the full-text fallback).
 */
export type SearchMode = 'hybrid' | 'lexical' | 'semantic';

/** @description The ranking a caller may request; `lexical` is only ever a fallback. */
export type RequestedSearchMode = Exclude<SearchMode, 'lexical'>;

/**
 * @description Why a search answered lexically instead of semantically. `embedder_busy`: the query
 * embed did not finish within `SEARCH_EMBED_BUDGET_MS` (e.g. behind a large re-embed).
 */
export type LexicalFallbackReason =
  | 'embedder_busy'
  | 'embedder_dimension_mismatch'
  | 'embedder_provider_error'
  | 'embedder_unconfigured'
  | 'no_embeddings';

export interface SearchWithFallbackOptions<TChunk> {
  /** Embeds the query (`inputType: 'query'`). */
  readonly embed: () => Promise<EmbedResult>;
  /** Full-text search, used when semantic search cannot answer. */
  readonly lexical: () => Promise<TChunk[]>;
  /** Vector search restricted to rows written by `model`. */
  readonly semantic: (vector: number[], model: string) => Promise<TChunk[]>;
}

export interface SearchWithFallbackResult<TChunk> {
  readonly chunks: TChunk[];
  readonly mode: SearchMode;
  readonly reason: LexicalFallbackReason | null;
}

export interface SearchHybridOptions<
  TChunk,
> extends SearchWithFallbackOptions<TChunk> {
  /** Identifies the entity a chunk belongs to; chunks of one entity fuse into one result. */
  readonly key: (chunk: TChunk) => string;
  /** Max results returned. */
  readonly limit: number;
  /** `semantic` skips fusion and returns the vector ranking unchanged. */
  readonly mode: RequestedSearchMode;
}

/** @description One result of {@link SearchHybridResult}. */
export interface RankedSearchChunk<TChunk> {
  readonly chunk: TChunk;
  /** The reciprocal-rank-fusion score when the result is `hybrid`, otherwise null. */
  readonly fusedScore: number | null;
}

export interface SearchHybridResult<TChunk> {
  readonly chunks: readonly RankedSearchChunk<TChunk>[];
  readonly mode: SearchMode;
  readonly reason: LexicalFallbackReason | null;
}

/** @description Ranked results per source, as `SearchResult.sourceCounts` reports them. */
export interface SearchSourceCountsValue {
  readonly documentation: number;
  readonly plan: number;
  readonly task: number;
}
