import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  embedWithOllama,
  isOllamaEmbeddingConfigured,
} from './ollama-embedding.js';

/**
 * Tests for ollama-embedding.ts: the env-driven configured check and the
 * embedWithOllama failure→undefined paths (no config, non-ok response, empty
 * payload, thrown fetch). global.fetch is mocked; an explicit config is passed
 * so these do not depend on env beyond the no-config case.
 */

const CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text',
} as const;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isOllamaEmbeddingConfigured', () => {
  test('true when OLLAMA_BASE_URL is set', () => {
    vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
    vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
    expect(isOllamaEmbeddingConfigured()).toBe(true);
  });

  test('true when OLLAMA_EMBEDDING_MODEL is set', () => {
    vi.stubEnv('OLLAMA_BASE_URL', '');
    vi.stubEnv('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
    expect(isOllamaEmbeddingConfigured()).toBe(true);
  });

  test('false when neither env var is set', () => {
    vi.stubEnv('OLLAMA_BASE_URL', '');
    vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
    expect(isOllamaEmbeddingConfigured()).toBe(false);
  });
});

describe('embedWithOllama', () => {
  test('returns the embedding on a successful response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ embedding: [0.1, 0.2, 0.3] }), {
        status: 200,
      }),
    );

    const result = await embedWithOllama('hello', CONFIG);

    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  test('returns undefined when no config is resolvable (env unset)', async () => {
    vi.stubEnv('OLLAMA_BASE_URL', '');
    vi.stubEnv('OLLAMA_EMBEDDING_MODEL', '');
    const fetchSpy = vi.spyOn(global, 'fetch');

    const result = await embedWithOllama('hello');

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns undefined on a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('error', { status: 500 }),
    );

    const result = await embedWithOllama('hello', CONFIG);

    expect(result).toBeUndefined();
  });

  test('returns undefined when the response embedding is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ embedding: [] }), { status: 200 }),
    );

    const result = await embedWithOllama('hello', CONFIG);

    expect(result).toBeUndefined();
  });

  test('returns undefined when fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await embedWithOllama('hello', CONFIG);

    expect(result).toBeUndefined();
  });
});
