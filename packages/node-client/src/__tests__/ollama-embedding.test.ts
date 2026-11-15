import { afterEach, describe, expect, test, vi } from 'vitest';

import { embedWithOllama } from '../ollama-embedding.ts';

const TARGET = { baseUrl: 'http://ollama.test', model: 'nomic-embed-text' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('embedWithOllama', () => {
  describe('when Ollama answers with one vector per input', () => {
    test('returns the vectors in order', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            embeddings: [
              [1, 2],
              [3, 4],
            ],
          }),
        ),
      );

      const result = await embedWithOllama(['a', 'b'], TARGET);

      expect(result).toEqual({
        ok: true,
        vectors: [
          [1, 2],
          [3, 4],
        ],
      });
    });
  });

  describe('when Ollama answers non-2xx', () => {
    test('returns provider_error naming the model', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('missing', { status: 404 }),
      );

      const result = await embedWithOllama(['a'], TARGET);

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('nomic-embed-text');
    });
  });

  describe('when the body has the wrong shape or count', () => {
    test('returns provider_error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ embeddings: [[1, 2]] })),
      );

      const result = await embedWithOllama(['a', 'b'], TARGET);

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
    });
  });

  describe('when Ollama is unreachable', () => {
    test('returns provider_error instead of throwing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('ECONNREFUSED'),
      );

      const result = await embedWithOllama(['a'], TARGET);

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('ECONNREFUSED');
    });
  });
});
