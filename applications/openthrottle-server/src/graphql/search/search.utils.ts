/**
 * @description Helpers shared by the semantic-search resolvers (OT plan 165e86ef).
 */

import type { EmbedFailureReason } from '@openthrottle/node-client';

import type {
  LexicalFallbackReason,
  SearchWithFallbackOptions,
  SearchWithFallbackResult,
} from './search.types.ts';

/** @description The `reason` a lexical answer reports for an embedder failure. */
export function lexicalFallbackReason(
  failure: EmbedFailureReason,
): LexicalFallbackReason {
  if (failure === 'unconfigured') {
    return 'embedder_unconfigured';
  }

  if (failure === 'dimension_mismatch') {
    return 'embedder_dimension_mismatch';
  }

  return 'embedder_provider_error';
}

/**
 * @description Semantic search when the embedder answers and vectors exist for its model;
 * otherwise Postgres full-text search, with the reason. A search is never silently empty
 * because the embedder is missing.
 */
export async function searchWithFallback<TChunk>(
  options: SearchWithFallbackOptions<TChunk>,
): Promise<SearchWithFallbackResult<TChunk>> {
  const embedded = await options.embed();

  if (!embedded.ok) {
    return {
      chunks: await options.lexical(),
      mode: 'lexical',
      reason: lexicalFallbackReason(embedded.reason),
    };
  }

  const vector = embedded.vectors[0];
  const chunks = vector ? await options.semantic(vector, embedded.model) : [];

  if (chunks.length > 0) {
    return { chunks, mode: 'semantic', reason: null };
  }

  // No vector for this model yet (e.g. mid-backfill): an empty semantic answer would hide
  // rows full-text can still find.
  return {
    chunks: await options.lexical(),
    mode: 'lexical',
    reason: 'no_embeddings',
  };
}
