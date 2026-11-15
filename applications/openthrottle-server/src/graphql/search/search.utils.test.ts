import type { EmbedResult } from '@openthrottle/node-client';
import { describe, expect, test, vi } from 'vitest';

import { lexicalFallbackReason, searchWithFallback } from './search.utils.ts';

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
