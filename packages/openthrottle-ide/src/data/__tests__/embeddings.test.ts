import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../embeddings.js';
import {
  createEmbeddingsProvider,
  EMBEDDING_DIMENSIONS,
} from '../embeddings.js';

/** Build a fake `fetch` that returns a canned JSON body and records its calls. */
function fakeFetch(body: unknown): {
  calls: { init?: unknown; input: string }[];
  fetch: FetchLike;
} {
  const calls: { init?: unknown; input: string }[] = [];
  const fetch: FetchLike = async (input, init) => {
    calls.push({ init, input });
    return {
      json: async () => body,
      ok: true,
      status: 200,
    };
  };
  return { calls, fetch };
}

describe('createEmbeddingsProvider (OpenAI)', () => {
  it('embeds a batch in a single request and preserves input order', async () => {
    const { calls, fetch } = fakeFetch({
      // Returned out of order to prove we sort by index.
      data: [
        { embedding: [0.2], index: 1 },
        { embedding: [0.1], index: 0 },
      ],
    });
    const provider = createEmbeddingsProvider({
      fetch,
      openAiApiKey: 'test-key',
    });

    const vectors = await provider.embed(['first', 'second']);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe('https://api.openai.com/v1/embeddings');
    expect(vectors).toEqual([[0.1], [0.2]]);
  });

  it('returns an empty array (no request) for empty input', async () => {
    const { calls, fetch } = fakeFetch({ data: [] });
    const provider = createEmbeddingsProvider({ fetch, openAiApiKey: 'k' });

    expect(await provider.embed([])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('throws when the API key is missing', async () => {
    const { fetch } = fakeFetch({ data: [] });
    const provider = createEmbeddingsProvider({ fetch, openAiApiKey: '' });

    await expect(provider.embed(['x'])).rejects.toThrow(/OPENAI_API_KEY/u);
  });
});

describe('createEmbeddingsProvider (Ollama)', () => {
  it('issues one request per text when Ollama is configured', async () => {
    const { calls, fetch } = fakeFetch({ embedding: [0.5] });
    const provider = createEmbeddingsProvider({
      fetch,
      ollamaModel: 'nomic-embed-text',
    });

    const vectors = await provider.embed(['a', 'b', 'c']);

    expect(calls).toHaveLength(3);
    expect(calls[0]?.input).toBe('http://localhost:11434/api/embeddings');
    expect(vectors).toEqual([[0.5], [0.5], [0.5]]);
  });
});

describe('EmbeddingsProvider as a mockable seam', () => {
  it('lets a consumer supply a stub implementing the interface', async () => {
    const embed = vi.fn(async (texts: string[]) =>
      texts.map(() => Array.from({ length: 2 }, () => 0)),
    );

    const vectors = await embed(['one', 'two']);

    expect(embed).toHaveBeenCalledWith(['one', 'two']);
    expect(vectors).toHaveLength(2);
  });

  it('exposes the OpenThrottle pgvector dimension', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });
});
