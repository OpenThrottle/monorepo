/**
 * @description Types shared by the semantic-search resolvers (OT plan 165e86ef).
 */

import type { EmbedResult } from '@openthrottle/node-client';

/** @description How a search result was ranked. */
export type SearchMode = 'lexical' | 'semantic';

/** @description Why a search answered lexically instead of semantically. */
export type LexicalFallbackReason =
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
