import { afterEach, describe, expect, test, vi } from 'vitest';

import type { HostedEmbeddingConfig } from '../embedding-config.ts';
import { resolveEmbeddingConfig } from '../embedding-config.ts';
import { embedWithGemini } from '../embedWithGemini.ts';

function geminiConfig(): HostedEmbeddingConfig {
  const result = resolveEmbeddingConfig({
    EMBEDDING_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'g-secret',
    GEMINI_BASE_URL: 'https://gemini.test/v1beta/',
  });

  if (!result.ok || result.config.provider !== 'gemini') {
    throw new Error('expected a gemini config');
  }

  return result.config;
}

const noSleep = vi.fn((_ms: number) => {
  return Promise.resolve();
});

afterEach(() => {
  vi.restoreAllMocks();
  noSleep.mockClear();
});

describe('embedWithGemini', () => {
  describe('when Gemini answers with one embedding per input', () => {
    test('sends 768 dims, the document task type and the key header, and normalises', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            embeddings: [{ values: [3, 4] }, { values: [0, 5] }],
          }),
        ),
      );

      const result = await embedWithGemini(
        ['a', 'b'],
        'document',
        geminiConfig(),
        {
          sleep: noSleep,
        },
      );

      expect(result).toEqual({
        ok: true,
        vectors: [
          [0.6, 0.8],
          [0, 1],
        ],
      });

      const [url, init] = fetchMock.mock.calls[0] ?? [];

      expect(url).toBe(
        'https://gemini.test/v1beta/models/gemini-embedding-001:batchEmbedContents',
      );
      expect(String(url)).not.toContain('g-secret');
      expect(JSON.parse(String(init?.body))).toEqual({
        requests: ['a', 'b'].map((text) => {
          return {
            content: { parts: [{ text }] },
            model: 'models/gemini-embedding-001',
            outputDimensionality: 768,
            taskType: 'RETRIEVAL_DOCUMENT',
          };
        }),
      });
      expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'g-secret' });
    });
  });

  describe('when the input is a query', () => {
    test('sends RETRIEVAL_QUERY', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({ embeddings: [{ values: [1, 0] }] })),
        );

      await embedWithGemini(['a'], 'query', geminiConfig(), { sleep: noSleep });

      const [, init] = fetchMock.mock.calls[0] ?? [];

      expect(JSON.parse(String(init?.body))).toMatchObject({
        requests: [{ taskType: 'RETRIEVAL_QUERY' }],
      });
    });
  });

  describe('when Gemini rate-limits and then answers', () => {
    test('backs off and succeeds', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('quota', { status: 429 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ embeddings: [{ values: [1, 0] }] })),
        );

      const result = await embedWithGemini(['a'], 'document', geminiConfig(), {
        sleep: noSleep,
      });

      expect(result).toEqual({ ok: true, vectors: [[1, 0]] });
      expect(noSleep).toHaveBeenCalledTimes(1);
    });
  });

  describe('when Gemini rejects the request', () => {
    test('returns provider_error at once with the status', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{"error":{"message":"API key not valid"}}', {
          status: 400,
        }),
      );

      const result = await embedWithGemini(['a'], 'document', geminiConfig(), {
        sleep: noSleep,
      });

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('400');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the body has the wrong shape or count', () => {
    test.each([
      { embeddings: [{ values: [1, 0] }] },
      { embeddings: [{ values: [1, 0] }, { values: 'x' }] },
      { nope: true },
    ])('returns provider_error for %j', async (body) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body)),
      );

      const result = await embedWithGemini(
        ['a', 'b'],
        'document',
        geminiConfig(),
        {
          sleep: noSleep,
        },
      );

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
    });
  });
});
