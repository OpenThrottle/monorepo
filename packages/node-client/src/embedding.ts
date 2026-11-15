/**
 * @description The one embedder for OpenThrottle semantic search (OT plan 165e86ef). Build it
 * with {@link createEmbedder} from a resolved {@link EmbeddingConfig}; every call returns an
 * {@link EmbedResult} — never `undefined` — so "no provider" is a reason a caller can report,
 * not an empty result it cannot tell apart from "no matches".
 */

import { EMBEDDING_MAX_INPUT_CHARS } from './constants.ts';
import type { EmbeddingConfig } from './embedding-config.ts';
import { embedWithOllama } from './embedWithOllama.ts';
import type { LocalEmbeddingBackendOptions } from './local-embedding.ts';
import { createLocalEmbeddingBackend } from './local-embedding.ts';

/**
 * @description What the text is for. nomic-embed-text was trained with a task prefix per side:
 * stored content gets `search_document: `, a search query gets `search_query: `.
 */
export type EmbeddingInputType = 'document' | 'query';

export type EmbedFailureReason =
  'dimension_mismatch' | 'provider_error' | 'unconfigured';

export interface EmbedSuccess {
  readonly dims: number;
  readonly model: string;
  readonly ok: true;
  readonly vectors: readonly number[][];
}

export interface EmbedFailure {
  readonly detail: string;
  readonly ok: false;
  readonly reason: EmbedFailureReason;
}

export type EmbedResult = EmbedFailure | EmbedSuccess;

/**
 * @description A provider's raw answer: vectors in input order, or a failure. The embedder adds
 * prefixing, truncation, batching and the dimension check on top.
 */
export type EmbeddingBackendResult =
  EmbedFailure | { readonly ok: true; readonly vectors: readonly number[][] };

export interface EmbeddingBackend {
  close(): Promise<void>;
  embed(texts: readonly string[]): Promise<EmbeddingBackendResult>;
}

export interface Embedder {
  close(): Promise<void>;
  readonly config: EmbeddingConfig;
  embed(
    texts: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<EmbedResult>;
}

export interface CreateEmbedderOptions {
  /** Override the provider backend (tests). */
  readonly backend: EmbeddingBackend | undefined;
  /** Passed to the local backend when it is created (tests inject a fake worker). */
  readonly local: LocalEmbeddingBackendOptions | undefined;
}

/** @description Texts sent to a provider per request; bounds worker memory on a large drain. */
export const EMBEDDING_BATCH_SIZE = 16;

/**
 * @description Applies the model's task prefix and truncates to the shared input cap. The
 * prefixed string is exactly what gets embedded, so it is also what `content_hash` hashes.
 * The cap counts Unicode code points, not UTF-16 units, so it agrees with Postgres
 * `left(text, n)` — the embeddings reconciler computes the same hash in SQL.
 */
export function prepareEmbeddingInput(
  config: EmbeddingConfig,
  text: string,
  inputType: EmbeddingInputType,
): string {
  const isQuery = inputType === 'query';
  const prefix = isQuery ? config.spec.queryPrefix : config.spec.documentPrefix;

  return truncateCodePoints(`${prefix}${text}`, EMBEDDING_MAX_INPUT_CHARS);
}

/** @description First `max` Unicode code points of `text` (never splits a surrogate pair). */
export function truncateCodePoints(text: string, max: number): string {
  // A code point is at most two UTF-16 units, so 2 * max units always hold max code points.
  if (text.length <= max) {
    return text;
  }

  return Array.from(text.slice(0, max * 2))
    .slice(0, max)
    .join('');
}

/**
 * @description Checks every vector against the configured dimension.
 * @returns A `dimension_mismatch` failure naming the first bad length, or undefined when all match.
 */
export function checkEmbeddingDimensions(
  vectors: readonly number[][],
  dims: number,
  model: string,
): EmbedFailure | undefined {
  const bad = vectors.find((vector) => {
    return vector.length !== dims;
  });

  if (bad === undefined) {
    return undefined;
  }

  return {
    detail: `${model} returned a ${bad.length}-dim vector; expected ${dims}.`,
    ok: false,
    reason: 'dimension_mismatch',
  };
}

function createBackend(
  config: EmbeddingConfig,
  options: CreateEmbedderOptions,
): EmbeddingBackend {
  if (options.backend) {
    return options.backend;
  }

  if (config.provider === 'ollama') {
    return {
      close: () => {
        return Promise.resolve();
      },
      embed: (texts) => {
        return embedWithOllama(texts, {
          baseUrl: config.ollamaBaseUrl,
          model: config.spec.ollamaName,
        });
      },
    };
  }

  return createLocalEmbeddingBackend(config, options.local);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }

  return chunks;
}

/**
 * @description Creates the embedder for a resolved config. The local backend starts its worker
 * thread lazily on the first embed, so creating an embedder is cheap; call `close()` on shutdown.
 */
export function createEmbedder(
  config: EmbeddingConfig,
  options: CreateEmbedderOptions = { backend: undefined, local: undefined },
): Embedder {
  const backend = createBackend(config, options);

  const embed = async (
    texts: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<EmbedResult> => {
    const inputs = texts.map((text) => {
      return prepareEmbeddingInput(config, text, inputType);
    });
    const vectors: number[][] = [];

    // Batches run sequentially on purpose: the local backend is one worker thread, so
    // concurrent batches would only queue there while holding every batch's memory at once.
    for (const batch of chunk(inputs, EMBEDDING_BATCH_SIZE)) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design, see above
      const result = await backend.embed(batch);

      if (!result.ok) {
        return result;
      }

      vectors.push(...result.vectors);
    }

    const mismatch = checkEmbeddingDimensions(
      vectors,
      config.dims,
      config.model,
    );

    if (mismatch) {
      return mismatch;
    }

    return { dims: config.dims, model: config.model, ok: true, vectors };
  };

  return {
    close: () => {
      return backend.close();
    },
    config,
    embed,
  };
}
