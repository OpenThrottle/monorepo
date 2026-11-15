import { afterEach, describe, expect, test, vi } from 'vitest';

import type { HostedEmbeddingConfig } from '../embedding-config.ts';
import { resolveEmbeddingConfig } from '../embedding-config.ts';
import { embedWithOpenAI } from '../embedWithOpenAI.ts';
import { HOSTED_EMBEDDING_MAX_ATTEMPTS } from '../hosted-embedding-request.ts';

function openAIConfig(): HostedEmbeddingConfig {
  const result = resolveEmbeddingConfig({
    EMBEDDING_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-secret',
    OPENAI_BASE_URL: 'https://openai.test/v1',
  });

  if (!result.ok || result.config.provider !== 'openai') {
    throw new Error('expected an openai config');
  }

  return result.config;
}

function vector(...values: number[]): number[] {
  return values;
}

const noSleep = vi.fn((_ms: number) => {
  return Promise.resolve();
});

afterEach(() => {
  vi.restoreAllMocks();
  noSleep.mockClear();
});

describe('embedWithOpenAI', () => {
  describe('when OpenAI answers with one row per input', () => {
    test('sends dims, model and key, and returns normalised vectors in index order', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { embedding: vector(0, 2), index: 1 },
              { embedding: vector(3, 4), index: 0 },
            ],
          }),
        ),
      );

      const result = await embedWithOpenAI(['a', 'b'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toEqual({
        ok: true,
        vectors: [
          [0.6, 0.8],
          [0, 1],
        ],
      });

      const [url, init] = fetchMock.mock.calls[0] ?? [];

      expect(url).toBe('https://openai.test/v1/embeddings');
      expect(JSON.parse(String(init?.body))).toEqual({
        dimensions: 768,
        encoding_format: 'float',
        input: ['a', 'b'],
        model: 'text-embedding-3-small',
      });
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer sk-secret',
      });
    });
  });

  describe('when OpenAI rate-limits and then answers', () => {
    test('backs off, honouring Retry-After, and succeeds', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response('slow down', {
            headers: { 'retry-after': '2' },
            status: 429,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ data: [{ embedding: vector(1, 0), index: 0 }] }),
          ),
        );

      const result = await embedWithOpenAI(['a'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toEqual({ ok: true, vectors: [[1, 0]] });
      expect(noSleep).toHaveBeenCalledWith(2000);
    });
  });

  describe('when OpenAI keeps failing with 5xx', () => {
    test('gives up after the max attempts with provider_error', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        return Promise.resolve(new Response('boom', { status: 503 }));
      });

      const result = await embedWithOpenAI(['a'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('503');
      expect(fetchMock).toHaveBeenCalledTimes(HOSTED_EMBEDDING_MAX_ATTEMPTS);
      expect(noSleep).toHaveBeenCalledTimes(HOSTED_EMBEDDING_MAX_ATTEMPTS - 1);
    });
  });

  describe('when OpenAI refuses the key', () => {
    test('returns provider_error at once without leaking the key', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{"error":{"message":"Incorrect API key"}}', {
          status: 401,
        }),
      );

      const result = await embedWithOpenAI(['a'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('401');
      expect(!result.ok && result.detail).not.toContain('sk-secret');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the body has the wrong shape or count', () => {
    test.each([
      { data: [{ embedding: vector(1, 0), index: 0 }] },
      {
        data: [
          { embedding: vector(1, 0), index: 0 },
          { embedding: vector(0, 1), index: 0 },
        ],
      },
      { data: 'nope' },
    ])('returns provider_error for %j', async (body) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body)),
      );

      const result = await embedWithOpenAI(['a', 'b'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
    });
  });

  describe('when OpenAI is unreachable', () => {
    test('retries, then returns provider_error instead of throwing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ENOTFOUND'));

      const result = await embedWithOpenAI(['a'], openAIConfig(), {
        sleep: noSleep,
      });

      expect(result).toMatchObject({ ok: false, reason: 'provider_error' });
      expect(!result.ok && result.detail).toContain('ENOTFOUND');
    });
  });
});
