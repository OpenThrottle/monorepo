/**
 * @description Throttle knobs for the local embedding worker (OT plan ca13e543). A backfill may
 * take longer, but it must never make the app unresponsive: background embeds reach the worker in
 * small slices so other requests interleave, and every input is capped in tokens so one huge chunk
 * cannot blow up memory (attention cost grows with the square of the padded length).
 */

import os from 'node:os';

/**
 * @description Texts per worker message for background (`document`) embeds. Small on purpose: a
 * search query waits for the slice in flight, and attention memory grows with rows × length². On
 * 400 real code chunks, 2 beat 8 on every measure — 5.1 vs 4.3 chunks/s, query p95 1.1s vs 4.7s,
 * peak RSS 3.4 GB vs 10.4 GB — because inputs are length-sorted, so little batching is lost.
 */
export const DEFAULT_EMBEDDINGS_BATCH_SLICE = 2;

/**
 * @description Token cap per input. nomic-embed-text-v1.5 was trained at 2048 tokens and
 * extended to 8192; 2048 keeps a worst-case slice to a few hundred MB of attention.
 */
export const DEFAULT_EMBEDDINGS_MAX_TOKENS = 2048;

/** @description Pause after each background slice before its next one; 0 = none. */
export const DEFAULT_EMBEDDINGS_SLICE_PAUSE_MS = 0;

/**
 * @description ONNX intra-op threads: half the cores (at least one), so inference never takes
 * every core from the API and the queue workers sharing the process.
 */
export function defaultEmbeddingsThreads(): number {
  return Math.max(1, Math.floor(os.availableParallelism() / 2));
}

/** @description nomic-embed-text-v1.5's context window; a larger cap is clamped to it. */
export const LOCAL_EMBEDDING_CONTEXT_TOKENS = 8192;

export interface LocalEmbeddingTuning {
  /** Upper bound on tokens per input; longer inputs are truncated by the tokenizer. */
  readonly maxTokens: number;
  /** Milliseconds a `document` embed waits after each slice before sending its next one. */
  readonly slicePauseMs: number;
  /** Texts per worker message for `document` embeds. Queries always go alone. */
  readonly sliceSize: number;
  /** ONNX intra-op thread count for the worker's session. */
  readonly threads: number;
}

function readInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
): number {
  const raw = env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value >= min ? value : fallback;
}

/**
 * @description Reads `EMBEDDINGS_BATCH_SLICE`, `EMBEDDINGS_MAX_TOKENS`, `EMBEDDINGS_THREADS` and
 * `EMBEDDINGS_SLICE_PAUSE_MS`. A missing or invalid value falls back to the default (the pause
 * accepts 0, the rest must be positive); the token cap is clamped to the model context.
 */
export function resolveLocalEmbeddingTuning(
  env: NodeJS.ProcessEnv = process.env,
): LocalEmbeddingTuning {
  const maxTokens = readInteger(
    env,
    'EMBEDDINGS_MAX_TOKENS',
    DEFAULT_EMBEDDINGS_MAX_TOKENS,
    1,
  );

  return {
    maxTokens: Math.min(maxTokens, LOCAL_EMBEDDING_CONTEXT_TOKENS),
    slicePauseMs: readInteger(
      env,
      'EMBEDDINGS_SLICE_PAUSE_MS',
      DEFAULT_EMBEDDINGS_SLICE_PAUSE_MS,
      0,
    ),
    sliceSize: readInteger(
      env,
      'EMBEDDINGS_BATCH_SLICE',
      DEFAULT_EMBEDDINGS_BATCH_SLICE,
      1,
    ),
    threads: readInteger(
      env,
      'EMBEDDINGS_THREADS',
      defaultEmbeddingsThreads(),
      1,
    ),
  };
}
