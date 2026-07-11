/**
 * Embeddings client for the semantic layer. Provider selection is explicit:
 * callers pass a fully-resolved {@link EmbeddingsConfig} discriminated union and
 * this module picks OpenAI or Ollama by `config.kind`. The module never reads
 * `process.env` — config resolution (env, DB, defaults, precedence) is owned by
 * the caller (see `AppConfigService`), so this leaf stays a pure function of its
 * input. Both concrete providers talk to their REST APIs over `fetch`, so the
 * engine stays free of a heavy SDK dependency and the `fetch` seam can be
 * swapped for a mock in tests.
 */

/** Embedding dimension used across OpenThrottle's pgvector schema. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Default OpenAI-compatible base URL. Exported for config resolvers. */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
/** Default OpenAI embedding model (1536-dim). Exported for config resolvers. */
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
/** Default Ollama base URL. Exported for config resolvers. */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
/** Default Ollama embedding model. Exported for config resolvers. */
export const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

/** Max characters sent per text, matching the OpenThrottle embedder. */
export const MAX_EMBEDDING_CHARS = 8191;

/**
 * Turns text into embedding vectors. The single seam the semantic layer depends
 * on: production wires {@link createEmbeddingsProvider}; tests supply a mock so
 * no live model is ever called.
 *
 * @public
 */
export interface EmbeddingsProvider {
  /**
   * Embed a batch of texts, returning one vector per input in the same order.
   * An empty input yields an empty array.
   */
  embed: (texts: string[]) => Promise<number[][]>;
}

/** A subset of the global `fetch` signature, injectable for tests. */
export type FetchLike = (
  input: string,
  init?: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
  },
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

/**
 * Fully-resolved embeddings configuration. The provider is chosen explicitly via
 * `kind` — never inferred from which field happens to be set. All precedence
 * (option vs env vs default) is resolved by the caller before this is built.
 *
 * @public
 */
export type EmbeddingsConfig =
  | {
      /** API key for the OpenAI-compatible endpoint. Sourced from env only. */
      apiKey?: string;
      /** OpenAI-compatible base URL (no trailing slash required). */
      baseUrl: string;
      kind: 'openai';
      /** OpenAI embedding model name. */
      model: string;
    }
  | {
      /** Ollama base URL (no trailing slash required). */
      baseUrl: string;
      kind: 'ollama';
      /** Ollama embedding model name. */
      model: string;
    };

/**
 * Build an {@link EmbeddingsProvider} from a fully-resolved {@link EmbeddingsConfig}.
 * Provider is selected by `config.kind`; this function reads no environment and
 * applies no defaults. The returned provider is plain data + a closure, so
 * consumers can equally pass any object satisfying {@link EmbeddingsProvider}.
 *
 * @public
 */
export function createEmbeddingsProvider(
  config: EmbeddingsConfig,
  fetchImpl: FetchLike = globalFetch,
): EmbeddingsProvider {
  return config.kind === 'ollama'
    ? createOllamaProvider(config, fetchImpl)
    : createOpenAiProvider(config, fetchImpl);
}

interface OpenAiEmbeddingsResponse {
  data: { embedding: number[]; index: number }[];
}

const isOpenAiEmbeddingsResponse = (
  value: unknown,
): value is OpenAiEmbeddingsResponse =>
  typeof value === 'object' &&
  value !== null &&
  'data' in value &&
  Array.isArray(value.data);

function createOpenAiProvider(
  config: Extract<EmbeddingsConfig, { kind: 'openai' }>,
  doFetch: FetchLike,
): EmbeddingsProvider {
  const apiKey = config.apiKey;
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const model = config.model;

  return {
    embed: async (texts: string[]): Promise<number[][]> => {
      if (texts.length === 0) {
        return [];
      }
      if (!apiKey) {
        throw new Error(
          'OpenAI embeddings require an API key (config.apiKey).',
        );
      }

      const response = await doFetch(`${baseUrl}/embeddings`, {
        body: JSON.stringify({
          input: texts.map((text) => text.slice(0, MAX_EMBEDDING_CHARS)),
          model,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI embeddings request failed with status ${response.status}.`,
        );
      }

      const payload: unknown = await response.json();
      if (!isOpenAiEmbeddingsResponse(payload)) {
        throw new Error('OpenAI embeddings response had an unexpected shape.');
      }
      // The API returns results indexed; sort defensively to guarantee order.
      return [...payload.data]
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.embedding);
    },
  };
}

interface OllamaEmbeddingsResponse {
  embedding: number[];
}

const isOllamaEmbeddingsResponse = (
  value: unknown,
): value is OllamaEmbeddingsResponse =>
  typeof value === 'object' &&
  value !== null &&
  'embedding' in value &&
  Array.isArray(value.embedding);

function createOllamaProvider(
  config: Extract<EmbeddingsConfig, { kind: 'ollama' }>,
  doFetch: FetchLike,
): EmbeddingsProvider {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const model = config.model;

  return {
    embed: async (texts: string[]): Promise<number[][]> =>
      // Ollama's /api/embeddings embeds a single prompt per request.
      Promise.all(
        texts.map(async (text) => {
          const response = await doFetch(`${baseUrl}/api/embeddings`, {
            body: JSON.stringify({
              model,
              prompt: text.slice(0, MAX_EMBEDDING_CHARS),
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error(
              `Ollama embeddings request failed with status ${response.status}.`,
            );
          }

          const payload: unknown = await response.json();
          if (!isOllamaEmbeddingsResponse(payload)) {
            throw new Error(
              'Ollama embeddings response had an unexpected shape.',
            );
          }
          return payload.embedding;
        }),
      ),
  };
}

const globalFetch: FetchLike = (input, init) => fetch(input, init);
