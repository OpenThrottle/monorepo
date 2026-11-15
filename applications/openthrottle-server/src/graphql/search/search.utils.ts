/**
 * @description Helpers shared by the semantic-search resolvers (OT plans 165e86ef, e5397271).
 */

import type { EmbedFailureReason } from '@openthrottle/node-client';

import type {
  LexicalFallbackReason,
  RankedSearchChunk,
  SearchHybridOptions,
  SearchHybridResult,
  SearchWithFallbackOptions,
  SearchWithFallbackResult,
} from './search.types.ts';

/**
 * @description The reciprocal-rank-fusion damping constant. 60 is the value from Cormack, Clarke and
 * Büttcher (SIGIR 2009) and the common default: it keeps a top-1 in one list from swamping a result
 * both lists rank highly.
 */
const RRF_K = 60;

/**
 * @description Merges ranked lists by reciprocal rank fusion: each entity scores `Σ 1 / (RRF_K + rank)`
 * over the lists it appears in, at its best rank in each. Chunks of one entity (same `key`) fuse into one
 * result, represented by the first list's chunk when it has one. Ties keep first-list order.
 */
export function fuseByReciprocalRank<TChunk>(
  lists: readonly (readonly TChunk[])[],
  key: (chunk: TChunk) => string,
  limit: number,
): RankedSearchChunk<TChunk>[] {
  const fused = new Map<string, { chunk: TChunk; score: number }>();

  lists.forEach((list) => {
    const seen = new Set<string>();

    list.forEach((chunk) => {
      const id = key(chunk);
      if (seen.has(id)) {
        return;
      }
      seen.add(id);

      const contribution = 1 / (RRF_K + seen.size);
      const existing = fused.get(id);

      if (existing) {
        existing.score += contribution;
      } else {
        fused.set(id, { chunk, score: contribution });
      }
    });
  });

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => {
      return { chunk: entry.chunk, fusedScore: entry.score };
    });
}

function unfused<TChunk>(
  chunks: readonly TChunk[],
  limit: number,
): RankedSearchChunk<TChunk>[] {
  return chunks.slice(0, limit).map((chunk) => {
    return { chunk, fusedScore: null };
  });
}

/**
 * @description Hybrid search: vector and full-text retrieval run together and merge by
 * {@link fuseByReciprocalRank}, so exact identifiers embeddings rank poorly still surface. `mode: 'semantic'`
 * returns the vector ranking alone. The fallback is {@link searchWithFallback}'s: lexical with a reason when
 * the embedder fails or nothing is embedded for its model.
 */
export async function searchHybrid<TChunk>(
  options: SearchHybridOptions<TChunk>,
): Promise<SearchHybridResult<TChunk>> {
  const embedded = await options.embed();

  if (!embedded.ok) {
    return {
      chunks: unfused(await options.lexical(), options.limit),
      mode: 'lexical',
      reason: lexicalFallbackReason(embedded.reason),
    };
  }

  const vector = embedded.vectors[0];
  const runSemantic = (): Promise<TChunk[]> => {
    return vector
      ? options.semantic(vector, embedded.model)
      : Promise.resolve([]);
  };
  const isHybrid = options.mode === 'hybrid';
  const [semantic, lexical] = await Promise.all([
    runSemantic(),
    isHybrid ? options.lexical() : Promise.resolve(null),
  ]);

  if (semantic.length === 0) {
    return {
      chunks: unfused(lexical ?? (await options.lexical()), options.limit),
      mode: 'lexical',
      reason: 'no_embeddings',
    };
  }

  if (lexical === null) {
    return {
      chunks: unfused(semantic, options.limit),
      mode: 'semantic',
      reason: null,
    };
  }

  return {
    chunks: fuseByReciprocalRank(
      [semantic, lexical],
      options.key,
      options.limit,
    ),
    mode: 'hybrid',
    reason: null,
  };
}

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
