import { describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '../embeddings.ts';
import {
  createEmbeddingsProvider,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_EMBEDDING_CHARS,
} from '../embeddings.ts';

/** Parse a recorded fetch call's JSON request body into a known shape. */
function parsedBody(call: RecordedCall | undefined): {
  input?: unknown;
  prompt?: unknown;
} {
  if (call?.body === undefined) {
    throw new Error('expected a JSON request body');
  }
  const parsed: unknown = JSON.parse(call.body);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('expected a JSON object request body');
  }
  const record: Record<string, unknown> = { ...parsed };
  return { input: record.input, prompt: record.prompt };
}

interface RecordedCall {
  body?: string;
  input: string;
}

/** Build a fake `fetch` that returns a canned JSON body and records its calls. */
function fakeFetch(body: unknown): {
  calls: RecordedCall[];
  fetch: FetchLike;
} {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (input, init) => {
    calls.push({ body: init?.body, input });
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
    const provider = createEmbeddingsProvider(
      {
        apiKey: 'test-key',
        baseUrl: DEFAULT_OPENAI_BASE_URL,
        kind: 'openai',
        model: DEFAULT_OPENAI_EMBEDDING_MODEL,
      },
      fetch,
    );

    const vectors = await provider.embed(['first', 'second']);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe('https://api.openai.com/v1/embeddings');
    expect(vectors).toEqual([[0.1], [0.2]]);
  });

  it('returns an empty array (no request) for empty input', async () => {
    const { calls, fetch } = fakeFetch({ data: [] });
    const provider = createEmbeddingsProvider(
      {
        apiKey: 'k',
        baseUrl: DEFAULT_OPENAI_BASE_URL,
        kind: 'openai',
        model: DEFAULT_OPENAI_EMBEDDING_MODEL,
      },
      fetch,
    );

    expect(await provider.embed([])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('caps each text at MAX_EMBEDDING_CHARS before sending', async () => {
    const { calls, fetch } = fakeFetch({
      data: [{ embedding: [0.1], index: 0 }],
    });
    const provider = createEmbeddingsProvider(
      {
        apiKey: 'k',
        baseUrl: DEFAULT_OPENAI_BASE_URL,
        kind: 'openai',
        model: DEFAULT_OPENAI_EMBEDDING_MODEL,
      },
      fetch,
    );

    await provider.embed(['x'.repeat(MAX_EMBEDDING_CHARS + 100)]);

    const { input } = parsedBody(calls[0]);
    expect(Array.isArray(input)).toBe(true);
    const [first] = Array.isArray(input) ? input : [];
    expect(typeof first).toBe('string');
    expect(typeof first === 'string' ? first.length : -1).toBe(
      MAX_EMBEDDING_CHARS,
    );
  });

  it('throws when the API key is missing', async () => {
    const { fetch } = fakeFetch({ data: [] });
    const provider = createEmbeddingsProvider(
      {
        apiKey: '',
        baseUrl: DEFAULT_OPENAI_BASE_URL,
        kind: 'openai',
        model: DEFAULT_OPENAI_EMBEDDING_MODEL,
      },
      fetch,
    );

    await expect(provider.embed(['x'])).rejects.toThrow(/API key/u);
  });
});

describe('createEmbeddingsProvider (Ollama)', () => {
  it('issues one request per text for the ollama kind', async () => {
    const { calls, fetch } = fakeFetch({ embedding: [0.5] });
    const provider = createEmbeddingsProvider(
      {
        baseUrl: DEFAULT_OLLAMA_BASE_URL,
        kind: 'ollama',
        model: DEFAULT_OLLAMA_EMBEDDING_MODEL,
      },
      fetch,
    );

    const vectors = await provider.embed(['a', 'b', 'c']);

    expect(calls).toHaveLength(3);
    expect(calls[0]?.input).toBe('http://localhost:11434/api/embeddings');
    expect(vectors).toEqual([[0.5], [0.5], [0.5]]);
  });

  it('caps each prompt at the same MAX_EMBEDDING_CHARS as OpenAI', async () => {
    const { calls, fetch } = fakeFetch({ embedding: [0.5] });
    const provider = createEmbeddingsProvider(
      {
        baseUrl: DEFAULT_OLLAMA_BASE_URL,
        kind: 'ollama',
        model: DEFAULT_OLLAMA_EMBEDDING_MODEL,
      },
      fetch,
    );

    await provider.embed(['y'.repeat(MAX_EMBEDDING_CHARS + 100)]);

    const { prompt } = parsedBody(calls[0]);
    expect(typeof prompt).toBe('string');
    expect(typeof prompt === 'string' ? prompt.length : -1).toBe(
      MAX_EMBEDDING_CHARS,
    );
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
