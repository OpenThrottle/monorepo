import os from 'node:os';

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_EMBEDDINGS_BATCH_SLICE,
  DEFAULT_EMBEDDINGS_MAX_TOKENS,
  DEFAULT_EMBEDDINGS_SLICE_PAUSE_MS,
  defaultEmbeddingsThreads,
  LOCAL_EMBEDDING_CONTEXT_TOKENS,
  resolveLocalEmbeddingTuning,
} from '../local-embedding-tuning.ts';

describe('resolveLocalEmbeddingTuning', () => {
  describe('when nothing is set', () => {
    test('uses the defaults', () => {
      expect(resolveLocalEmbeddingTuning({})).toEqual({
        maxTokens: DEFAULT_EMBEDDINGS_MAX_TOKENS,
        slicePauseMs: DEFAULT_EMBEDDINGS_SLICE_PAUSE_MS,
        sliceSize: DEFAULT_EMBEDDINGS_BATCH_SLICE,
        threads: defaultEmbeddingsThreads(),
      });
    });

    test('leaves at least one thread and at most half the cores', () => {
      const threads = defaultEmbeddingsThreads();

      expect(threads).toBeGreaterThanOrEqual(1);
      expect(threads).toBeLessThanOrEqual(
        Math.max(1, Math.floor(os.availableParallelism() / 2)),
      );
    });
  });

  describe('when every knob is set', () => {
    test('uses them', () => {
      expect(
        resolveLocalEmbeddingTuning({
          EMBEDDINGS_BATCH_SLICE: '4',
          EMBEDDINGS_MAX_TOKENS: ' 1024 ',
          EMBEDDINGS_SLICE_PAUSE_MS: '0',
          EMBEDDINGS_THREADS: '2',
        }),
      ).toEqual({ maxTokens: 1024, slicePauseMs: 0, sliceSize: 4, threads: 2 });
    });
  });

  describe('when a value is not a positive integer', () => {
    test.each(['0', '-3', '2.5', 'eight', ''])(
      'falls back to the default for %j',
      (raw) => {
        expect(
          resolveLocalEmbeddingTuning({
            EMBEDDINGS_BATCH_SLICE: raw,
            EMBEDDINGS_MAX_TOKENS: raw,
            EMBEDDINGS_THREADS: raw,
          }),
        ).toMatchObject({
          maxTokens: DEFAULT_EMBEDDINGS_MAX_TOKENS,
          sliceSize: DEFAULT_EMBEDDINGS_BATCH_SLICE,
          threads: defaultEmbeddingsThreads(),
        });
      },
    );
  });

  describe('when the slice pause is negative', () => {
    test('falls back to no pause', () => {
      expect(
        resolveLocalEmbeddingTuning({ EMBEDDINGS_SLICE_PAUSE_MS: '-5' })
          .slicePauseMs,
      ).toBe(DEFAULT_EMBEDDINGS_SLICE_PAUSE_MS);
    });
  });

  describe('when the token cap exceeds the model context', () => {
    test('clamps it to the context', () => {
      expect(
        resolveLocalEmbeddingTuning({ EMBEDDINGS_MAX_TOKENS: '100000' })
          .maxTokens,
      ).toBe(LOCAL_EMBEDDING_CONTEXT_TOKENS);
    });
  });
});
