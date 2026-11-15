import { describe, expect, test, vi } from 'vitest';

import { EMBEDDING_MAX_INPUT_CHARS } from '../constants.ts';
import type { EmbeddingBackend } from '../embedding.ts';
import {
  checkEmbeddingDimensions,
  createEmbedder,
  EMBEDDING_BATCH_SIZE,
  prepareEmbeddingInput,
  truncateCodePoints,
} from '../embedding.ts';
import type { EmbeddingConfig } from '../embedding-config.ts';
import { resolveEmbeddingConfig } from '../embedding-config.ts';

function localConfig(): EmbeddingConfig {
  const result = resolveEmbeddingConfig({});

  if (!result.ok) {
    throw new Error(result.detail);
  }

  return result.config;
}

function fakeBackend(dims: number): EmbeddingBackend & {
  readonly embed: ReturnType<typeof vi.fn<EmbeddingBackend['embed']>>;
} {
  return {
    close: vi.fn(() => {
      return Promise.resolve();
    }),
    embed: vi.fn<EmbeddingBackend['embed']>((texts) => {
      return Promise.resolve({
        ok: true,
        vectors: texts.map(() => {
          return Array.from({ length: dims }, () => {
            return 0.5;
          });
        }),
      });
    }),
  };
}

describe('prepareEmbeddingInput', () => {
  const config = localConfig();

  test('prefixes stored content with search_document:', () => {
    expect(prepareEmbeddingInput(config, 'hello', 'document')).toBe(
      'search_document: hello',
    );
  });

  test('prefixes queries with search_query:', () => {
    expect(prepareEmbeddingInput(config, 'hello', 'query')).toBe(
      'search_query: hello',
    );
  });

  test('truncates prefix + text to the shared input cap', () => {
    const prepared = prepareEmbeddingInput(
      config,
      'x'.repeat(20_000),
      'document',
    );

    expect(prepared).toHaveLength(EMBEDDING_MAX_INPUT_CHARS);
    expect(prepared.startsWith('search_document: ')).toBe(true);
  });
});

describe('truncateCodePoints', () => {
  test('counts code points like Postgres left(), not UTF-16 units', () => {
    expect(truncateCodePoints('a😀b😀c', 3)).toBe('a😀b');
  });

  test('returns short text unchanged', () => {
    expect(truncateCodePoints('abc', 10)).toBe('abc');
  });
});

describe('checkEmbeddingDimensions', () => {
  test('passes when every vector matches', () => {
    expect(
      checkEmbeddingDimensions(
        [
          [1, 2],
          [3, 4],
        ],
        2,
        'm',
      ),
    ).toBeUndefined();
  });

  test('reports the first mismatched length', () => {
    expect(checkEmbeddingDimensions([[1, 2], [3]], 2, 'm')).toMatchObject({
      ok: false,
      reason: 'dimension_mismatch',
    });
  });
});

describe('createEmbedder', () => {
  describe('when the backend answers with the configured dimension', () => {
    test('returns vectors with model and dims provenance', async () => {
      const backend = fakeBackend(768);
      const embedder = createEmbedder(localConfig(), {
        backend,
        local: undefined,
      });

      const result = await embedder.embed(['a', 'b'], 'query');

      expect(result).toMatchObject({
        dims: 768,
        model: 'nomic-embed-text-v1.5',
        ok: true,
      });
      expect(result.ok && result.vectors).toHaveLength(2);
      expect(backend.embed).toHaveBeenCalledWith(
        ['search_query: a', 'search_query: b'],
        'query',
      );
    });
  });

  describe('when there are more texts than one batch', () => {
    test('splits them into batches and keeps input order', async () => {
      const backend = fakeBackend(768);
      const embedder = createEmbedder(localConfig(), {
        backend,
        local: undefined,
      });
      const texts = Array.from(
        { length: EMBEDDING_BATCH_SIZE + 3 },
        (_, index) => {
          return String(index);
        },
      );

      const result = await embedder.embed(texts, 'document');

      expect(backend.embed).toHaveBeenCalledTimes(2);
      expect(backend.embed.mock.calls[1]?.[0]).toEqual([
        `search_document: ${EMBEDDING_BATCH_SIZE}`,
        `search_document: ${EMBEDDING_BATCH_SIZE + 1}`,
        `search_document: ${EMBEDDING_BATCH_SIZE + 2}`,
      ]);
      expect(result.ok && result.vectors).toHaveLength(
        EMBEDDING_BATCH_SIZE + 3,
      );
    });
  });

  describe('when the backend returns the wrong dimension', () => {
    test('fails with dimension_mismatch', async () => {
      const embedder = createEmbedder(localConfig(), {
        backend: fakeBackend(1536),
        local: undefined,
      });

      const result = await embedder.embed(['a'], 'document');

      expect(result).toMatchObject({ ok: false, reason: 'dimension_mismatch' });
    });
  });

  describe('when the backend fails', () => {
    test('passes the failure through and stops batching', async () => {
      const backend = fakeBackend(768);

      backend.embed.mockResolvedValueOnce({
        detail: 'down',
        ok: false,
        reason: 'provider_error',
      });
      const embedder = createEmbedder(localConfig(), {
        backend,
        local: undefined,
      });

      const result = await embedder.embed(
        Array.from({ length: EMBEDDING_BATCH_SIZE * 2 }, () => {
          return 'x';
        }),
        'document',
      );

      expect(result).toEqual({
        detail: 'down',
        ok: false,
        reason: 'provider_error',
      });
      expect(backend.embed).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the provider is ollama', () => {
    test('calls the Ollama batch endpoint with the same model', async () => {
      const result = resolveEmbeddingConfig({ EMBEDDING_PROVIDER: 'ollama' });

      if (!result.ok) throw new Error(result.detail);
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            embeddings: [Array.from({ length: 768 }, () => 0)],
          }),
        ),
      );
      const embedder = createEmbedder(result.config);

      const embedded = await embedder.embed(['a'], 'query');

      expect(embedded.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/embed',
        expect.objectContaining({
          body: JSON.stringify({
            input: ['search_query: a'],
            model: 'nomic-embed-text',
          }),
        }),
      );
      fetchMock.mockRestore();
    });
  });
  describe('when the provider is openai', () => {
    test('sends unprefixed text at 768 dims and records the OpenAI model', async () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
      });

      if (!result.ok) throw new Error(result.detail);
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                embedding: Array.from({ length: 768 }, () => 1),
                index: 0,
              },
            ],
          }),
        ),
      );
      const embedder = createEmbedder(result.config);

      const embedded = await embedder.embed(['a'], 'query');

      expect(embedded).toMatchObject({
        dims: 768,
        model: 'text-embedding-3-small',
        ok: true,
      });
      const [url, init] = fetchMock.mock.calls[0] ?? [];

      expect(url).toBe('https://api.openai.com/v1/embeddings');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        dimensions: 768,
        input: ['a'],
      });
      fetchMock.mockRestore();
    });
  });
  describe('when the provider is gemini', () => {
    test('sends RETRIEVAL_QUERY for a query and records the Gemini model', async () => {
      const result = resolveEmbeddingConfig({
        EMBEDDING_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'g-test',
      });

      if (!result.ok) throw new Error(result.detail);
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            embeddings: [{ values: Array.from({ length: 768 }, () => 1) }],
          }),
        ),
      );
      const embedder = createEmbedder(result.config);

      const embedded = await embedder.embed(['a'], 'query');

      expect(embedded).toMatchObject({
        dims: 768,
        model: 'gemini-embedding-001',
        ok: true,
      });
      const [, init] = fetchMock.mock.calls[0] ?? [];

      expect(JSON.parse(String(init?.body))).toMatchObject({
        requests: [
          { content: { parts: [{ text: 'a' }] }, taskType: 'RETRIEVAL_QUERY' },
        ],
      });
      fetchMock.mockRestore();
    });
  });
});
