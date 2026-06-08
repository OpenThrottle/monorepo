/**
 * Embeddings client for the semantic layer. The provider contract mirrors
 * OpenThrottle's existing embeddings infrastructure (see the design spike):
 * OpenAI `text-embedding-3-small` (1536-dim) by default, Ollama when configured
 * — selected by the same `OPENAI_API_KEY` / `OLLAMA_BASE_URL` /
 * `OLLAMA_EMBEDDING_MODEL` env vars. Both concrete providers talk to their REST
 * APIs over `fetch`, so the engine stays free of a heavy SDK dependency and any
 * provider can be swapped for a mock in tests.
 */

/** Embedding dimension used across OpenThrottle's pgvector schema. */
export const EMBEDDING_DIMENSIONS = 1536;

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

/** Max characters sent per text, matching the OpenThrottle embedder. */
const MAX_EMBEDDING_CHARS = 8191;

/**
 * Turns text into embedding vectors. The single seam the semantic layer depends
 * on: production wires {@link createEmbeddingsProvider}; tests supply a mock so
 * no live model is ever called.
 *
 * @publicApi
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

/** Options for {@link createEmbeddingsProvider}. All fields fall back to env/defaults. */
export interface EmbeddingsProviderOptions {
  /** Override the `fetch` implementation (tests). Defaults to global `fetch`. */
  fetch?: FetchLike;
  /** Ollama base URL. Defaults to `OLLAMA_BASE_URL` env or `http://localhost:11434`. */
  ollamaBaseUrl?: string;
  /** Ollama model. Defaults to `OLLAMA_EMBEDDING_MODEL` env or `nomic-embed-text`. */
  ollamaModel?: string;
  /** OpenAI API key. Defaults to `OPENAI_API_KEY` env. */
  openAiApiKey?: string;
  /** OpenAI-compatible base URL. Defaults to `https://api.openai.com/v1`. */
  openAiBaseUrl?: string;
  /** OpenAI embedding model. Defaults to `text-embedding-3-small`. */
  openAiModel?: string;
}

/**
 * Build the default {@link EmbeddingsProvider} from options + env, matching the
 * spike decision: Ollama when `OLLAMA_BASE_URL`/`OLLAMA_EMBEDDING_MODEL` (or the
 * matching options) are set, otherwise OpenAI. The returned provider is plain
 * data + a closure, so consumers can equally pass any object satisfying
 * {@link EmbeddingsProvider}.
 *
 * @publicApi
 */
export function createEmbeddingsProvider(
  options: EmbeddingsProviderOptions = {},
): EmbeddingsProvider {
  return isOllamaConfigured(options)
    ? createOllamaProvider(options)
    : createOpenAiProvider(options);
}

function isOllamaConfigured(options: EmbeddingsProviderOptions): boolean {
  return Boolean(
    options.ollamaBaseUrl ??
    options.ollamaModel ??
    process.env.OLLAMA_BASE_URL?.trim() ??
    process.env.OLLAMA_EMBEDDING_MODEL?.trim(),
  );
}

interface OpenAiEmbeddingsResponse {
  data: { embedding: number[]; index: number }[];
}

function createOpenAiProvider(
  options: EmbeddingsProviderOptions,
): EmbeddingsProvider {
  const apiKey = options.openAiApiKey ?? process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (options.openAiBaseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(
    /\/$/,
    '',
  );
  const model = options.openAiModel ?? DEFAULT_OPENAI_EMBEDDING_MODEL;
  const doFetch = options.fetch ?? globalFetch;

  return {
    embed: async (texts: string[]): Promise<number[][]> => {
      if (texts.length === 0) {
        return [];
      }
      if (!apiKey) {
        throw new Error(
          'OpenAI embeddings require OPENAI_API_KEY (or openAiApiKey option).',
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

      const payload = (await response.json()) as OpenAiEmbeddingsResponse;
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

function createOllamaProvider(
  options: EmbeddingsProviderOptions,
): EmbeddingsProvider {
  const baseUrl = (
    options.ollamaBaseUrl ??
    process.env.OLLAMA_BASE_URL?.trim() ??
    DEFAULT_OLLAMA_BASE_URL
  ).replace(/\/$/, '');
  const model =
    options.ollamaModel ??
    process.env.OLLAMA_EMBEDDING_MODEL?.trim() ??
    DEFAULT_OLLAMA_EMBEDDING_MODEL;
  const doFetch = options.fetch ?? globalFetch;

  return {
    embed: async (texts: string[]): Promise<number[][]> =>
      // Ollama's /api/embeddings embeds a single prompt per request.
      Promise.all(
        texts.map(async (text) => {
          const response = await doFetch(`${baseUrl}/api/embeddings`, {
            body: JSON.stringify({
              model,
              prompt: text.slice(0, MAX_EMBEDDING_CHARS + 1),
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error(
              `Ollama embeddings request failed with status ${response.status}.`,
            );
          }

          const payload = (await response.json()) as OllamaEmbeddingsResponse;
          return payload.embedding;
        }),
      ),
  };
}

const globalFetch: FetchLike = (input, init) => fetch(input, init);
