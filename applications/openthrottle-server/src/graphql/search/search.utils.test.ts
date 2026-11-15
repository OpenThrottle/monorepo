import type { EmbedResult } from '@openthrottle/node-client';
import { describe, expect, test, vi } from 'vitest';

import type { SearchHybridOptions } from './search.types.ts';
import {
  fuseByReciprocalRank,
  lexicalFallbackReason,
  searchHybrid,
  searchWithFallback,
} from './search.utils.ts';

const OK: EmbedResult = {
  dims: 768,
  model: 'nomic-embed-text-v1.5',
  ok: true,
  vectors: [[0.1, 0.2]],
};

function options(
  embedded: EmbedResult,
  semanticHits: string[],
): {
  readonly embed: () => Promise<EmbedResult>;
  readonly lexical: ReturnType<typeof vi.fn<() => Promise<string[]>>>;
  readonly semantic: ReturnType<
    typeof vi.fn<(vector: number[], model: string) => Promise<string[]>>
  >;
} {
  return {
    embed: () => {
      return Promise.resolve(embedded);
    },
    lexical: vi.fn(() => {
      return Promise.resolve(['lexical-hit']);
    }),
    semantic: vi.fn(() => {
      return Promise.resolve(semanticHits);
    }),
  };
}

describe('searchWithFallback', () => {
  describe('when the embedder answers and vectors match', () => {
    test('returns the semantic hits for the embedded model', async () => {
      const opts = options(OK, ['semantic-hit']);

      await expect(searchWithFallback(opts)).resolves.toEqual({
        chunks: ['semantic-hit'],
        mode: 'semantic',
        reason: null,
      });
      expect(opts.semantic).toHaveBeenCalledWith(
        [0.1, 0.2],
        'nomic-embed-text-v1.5',
      );
      expect(opts.lexical).not.toHaveBeenCalled();
    });
  });

  describe('when the embedder is unconfigured', () => {
    test('answers lexically with the reason instead of empty', async () => {
      const opts = options(
        { detail: 'no weights', ok: false, reason: 'unconfigured' },
        [],
      );

      await expect(searchWithFallback(opts)).resolves.toEqual({
        chunks: ['lexical-hit'],
        mode: 'lexical',
        reason: 'embedder_unconfigured',
      });
      expect(opts.semantic).not.toHaveBeenCalled();
    });
  });

  describe('when nothing is embedded for the model yet', () => {
    test('answers lexically with no_embeddings', async () => {
      const opts = options(OK, []);

      await expect(searchWithFallback(opts)).resolves.toEqual({
        chunks: ['lexical-hit'],
        mode: 'lexical',
        reason: 'no_embeddings',
      });
    });
  });
});

describe('lexicalFallbackReason', () => {
  test.each([
    ['unconfigured', 'embedder_unconfigured'],
    ['dimension_mismatch', 'embedder_dimension_mismatch'],
    ['provider_error', 'embedder_provider_error'],
  ] as const)('maps %s to %s', (failure, reason) => {
    expect(lexicalFallbackReason(failure)).toBe(reason);
  });
});

const identity = (chunk: string): string => {
  return chunk;
};

describe('fuseByReciprocalRank', () => {
  test("ranks an entity both lists found above one list's top hit", () => {
    const fused = fuseByReciprocalRank(
      [
        ['a', 'b'],
        ['c', 'b'],
      ],
      identity,
      10,
    );

    expect(fused.map((r) => r.chunk)).toEqual(['b', 'a', 'c']);
    expect(fused[0]?.fusedScore).toBeCloseTo(2 / 62);
    expect(fused[1]?.fusedScore).toBeCloseTo(1 / 61);
  });

  test('scores an entity at its best rank and ranks by distinct entities', () => {
    const fused = fuseByReciprocalRank(
      [['a:1', 'a:2', 'b:1']],
      (chunk) => chunk.split(':')[0] ?? chunk,
      10,
    );

    expect(fused).toEqual([
      { chunk: 'a:1', fusedScore: 1 / 61 },
      { chunk: 'b:1', fusedScore: 1 / 62 },
    ]);
  });

  test("keeps the first list's chunk as the representative", () => {
    const fused = fuseByReciprocalRank(
      [['x:vector'], ['x:lexical']],
      (chunk) => chunk.split(':')[0] ?? chunk,
      10,
    );

    expect(fused.map((r) => r.chunk)).toEqual(['x:vector']);
  });

  test('cuts the merge to the limit', () => {
    expect(fuseByReciprocalRank([['a', 'b', 'c']], identity, 2)).toHaveLength(
      2,
    );
  });
});

interface HybridTestOptions extends SearchHybridOptions<string> {
  readonly lexical: ReturnType<typeof vi.fn<() => Promise<string[]>>>;
}

describe('searchHybrid', () => {
  function hybridOptions(
    embedded: EmbedResult,
    semanticHits: string[],
    lexicalHits: string[],
    mode: 'hybrid' | 'semantic',
  ): HybridTestOptions {
    return {
      embed: () => {
        return Promise.resolve(embedded);
      },
      key: identity,
      lexical: vi.fn(() => {
        return Promise.resolve(lexicalHits);
      }),
      limit: 10,
      mode,
      semantic: () => {
        return Promise.resolve(semanticHits);
      },
    };
  }

  describe('when the mode is hybrid', () => {
    test('fuses both rankings and reports mode hybrid', async () => {
      const result = await searchHybrid(
        hybridOptions(OK, ['a', 'b'], ['c', 'b'], 'hybrid'),
      );

      expect(result.mode).toBe('hybrid');
      expect(result.reason).toBeNull();
      expect(result.chunks.map((r) => r.chunk)).toEqual(['b', 'a', 'c']);
    });

    test('runs full-text once even when it becomes the no_embeddings fallback', async () => {
      const opts = hybridOptions(OK, [], ['c'], 'hybrid');
      const result = await searchHybrid(opts);

      expect(result).toEqual({
        chunks: [{ chunk: 'c', fusedScore: null }],
        mode: 'lexical',
        reason: 'no_embeddings',
      });
      expect(opts.lexical).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the mode is semantic', () => {
    test('returns the vector ranking alone without running full-text', async () => {
      const opts = hybridOptions(OK, ['a', 'b'], ['c'], 'semantic');
      const result = await searchHybrid(opts);

      expect(result).toEqual({
        chunks: [
          { chunk: 'a', fusedScore: null },
          { chunk: 'b', fusedScore: null },
        ],
        mode: 'semantic',
        reason: null,
      });
      expect(opts.lexical).not.toHaveBeenCalled();
    });
  });

  describe('when the embedder fails', () => {
    test('keeps the 165e86ef lexical fallback with its reason', async () => {
      const result = await searchHybrid(
        hybridOptions(
          { detail: 'down', ok: false, reason: 'provider_error' },
          ['a'],
          ['c'],
          'hybrid',
        ),
      );

      expect(result).toEqual({
        chunks: [{ chunk: 'c', fusedScore: null }],
        mode: 'lexical',
        reason: 'embedder_provider_error',
      });
    });
  });
});
