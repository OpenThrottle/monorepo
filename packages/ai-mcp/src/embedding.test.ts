import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Tests for the embedder provider-selection branch in embedding.ts: Ollama is
 * used when OLLAMA_BASE_URL or OLLAMA_EMBEDDING_MODEL is set, otherwise OpenAI.
 * The OpenAI SDK and the Ollama HTTP call are both mocked, so no network or API
 * key is required.
 */

const ollama = vi.hoisted(() => ({
  embedWithOllama: vi.fn(),
  isOllamaEmbeddingConfigured: vi.fn(),
}));

const openaiCreate = vi.hoisted(() => vi.fn());

vi.mock('./ollama-embedding.js', () => ({
  embedWithOllama: ollama.embedWithOllama,
  isOllamaEmbeddingConfigured: ollama.isOllamaEmbeddingConfigured,
}));

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: openaiCreate };
  },
}));

const { embedQuery } = await import('./embedding.js');

beforeEach(() => {
  ollama.embedWithOllama.mockReset();
  ollama.isOllamaEmbeddingConfigured.mockReset();
  openaiCreate.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('embedQuery provider selection', () => {
  test('uses the Ollama provider when Ollama is configured', async () => {
    ollama.isOllamaEmbeddingConfigured.mockReturnValue(true);
    ollama.embedWithOllama.mockResolvedValue([1, 2, 3]);

    const result = await embedQuery('hello');

    expect(result).toEqual([1, 2, 3]);
    expect(ollama.embedWithOllama).toHaveBeenCalledWith('hello');
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test('uses the OpenAI provider when Ollama is not configured', async () => {
    ollama.isOllamaEmbeddingConfigured.mockReturnValue(false);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openaiCreate.mockResolvedValue({
      data: [{ embedding: Array.from({ length: 1536 }, () => 0.1) }],
    });

    const result = await embedQuery('hello');

    expect(result).toHaveLength(1536);
    expect(openaiCreate).toHaveBeenCalledTimes(1);
    expect(ollama.embedWithOllama).not.toHaveBeenCalled();
  });

  test('returns undefined on the OpenAI path when OPENAI_API_KEY is missing', async () => {
    ollama.isOllamaEmbeddingConfigured.mockReturnValue(false);
    vi.stubEnv('OPENAI_API_KEY', '');

    const result = await embedQuery('hello');

    expect(result).toBeUndefined();
    expect(openaiCreate).not.toHaveBeenCalled();
  });

  test('returns undefined when the OpenAI embedding has an unexpected dimension', async () => {
    ollama.isOllamaEmbeddingConfigured.mockReturnValue(false);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openaiCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });

    const result = await embedQuery('hello');

    expect(result).toBeUndefined();
  });

  test('returns undefined when the OpenAI request throws', async () => {
    ollama.isOllamaEmbeddingConfigured.mockReturnValue(false);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openaiCreate.mockRejectedValue(new Error('rate limited'));

    const result = await embedQuery('hello');

    expect(result).toBeUndefined();
  });
});
