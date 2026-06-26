import { describe, expect, it, vi } from 'vitest';

import type { CodeChunk } from '../chunk.ts';
import type { EmbeddingsProvider } from '../embeddings.ts';
import { semanticSearch } from '../semantic.ts';
import type { VectorMatch, VectorStore } from '../semantic.ts';

function chunk(path: string, content: string): CodeChunk {
  return { content, endLine: 1, id: `${path}:${content}`, path, startLine: 1 };
}

/** A store seeded with fixed matches; records the topK it was asked for. */
function seededStore(matches: VectorMatch[]): VectorStore & {
  readonly topKCalls: number[];
} {
  const topKCalls: number[] = [];

  return {
    clear: async (): Promise<void> => undefined,
    deleteByPaths: async (): Promise<void> => undefined,
    query: async (_root, _embedding, topK): Promise<VectorMatch[]> => {
      topKCalls.push(topK);
      // Return in deliberately unsorted order, capped at topK.
      return matches.slice(0, topK);
    },
    topKCalls,
    upsert: async (): Promise<void> => undefined,
  };
}

const provider: EmbeddingsProvider = {
  embed: async (texts: string[]) => texts.map(() => [1, 0, 0]),
};

describe('semanticSearch', () => {
  it('returns matches ordered by descending score with path/lines/snippet', async () => {
    const store = seededStore([
      { chunk: chunk('src/low.ts', 'low'), score: 0.1 },
      { chunk: chunk('src/high.ts', 'high'), score: 0.9 },
      { chunk: chunk('src/mid.ts', 'mid'), score: 0.5 },
    ]);

    const results = await semanticSearch(
      'find me',
      { root: '/ws' },
      {
        provider,
        store,
      },
    );

    expect(results.map((match) => match.path)).toEqual([
      'src/high.ts',
      'src/mid.ts',
      'src/low.ts',
    ]);
    expect(results[0]).toEqual({
      content: 'high',
      endLine: 1,
      path: 'src/high.ts',
      score: 0.9,
      startLine: 1,
    });
  });

  it('limits results to topK and forwards topK to the store', async () => {
    const store = seededStore([
      { chunk: chunk('a.ts', 'a'), score: 0.9 },
      { chunk: chunk('b.ts', 'b'), score: 0.8 },
      { chunk: chunk('c.ts', 'c'), score: 0.7 },
    ]);

    const results = await semanticSearch(
      'q',
      { root: '/ws' },
      {
        provider,
        store,
        topK: 2,
      },
    );

    expect(store.topKCalls).toEqual([2]);
    expect(results).toHaveLength(2);
    expect(results.map((m) => m.path)).toEqual(['a.ts', 'b.ts']);
  });

  it('embeds the query via the provider and returns empty when no embedding', async () => {
    const embed = vi.fn(async (): Promise<number[][]> => []);
    const store = seededStore([{ chunk: chunk('a.ts', 'a'), score: 1 }]);

    const results = await semanticSearch(
      'q',
      { root: '/ws' },
      {
        provider: { embed },
        store,
      },
    );

    expect(embed).toHaveBeenCalledWith(['q']);
    expect(results).toEqual([]);
  });
});
