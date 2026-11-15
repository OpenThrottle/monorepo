import { describe, expect, test } from 'vitest';

import {
  DEFAULT_EMBEDDINGS_CONCURRENCY,
  DEFAULT_EMBEDDINGS_RATE_LIMIT_DURATION_MS,
  DEFAULT_EMBEDDINGS_RATE_LIMIT_MAX,
} from './embeddings.constants.ts';
import { resolveEmbeddingsWorkerSettings } from './embeddings.utils.ts';

describe('resolveEmbeddingsWorkerSettings', () => {
  describe('when nothing is set', () => {
    test('runs one job at a time under the default limiter', () => {
      expect(resolveEmbeddingsWorkerSettings({})).toEqual({
        concurrency: DEFAULT_EMBEDDINGS_CONCURRENCY,
        limiter: {
          duration: DEFAULT_EMBEDDINGS_RATE_LIMIT_DURATION_MS,
          max: DEFAULT_EMBEDDINGS_RATE_LIMIT_MAX,
        },
      });
      expect(DEFAULT_EMBEDDINGS_CONCURRENCY).toBe(1);
    });
  });

  describe('when every knob is set', () => {
    test('uses them', () => {
      expect(
        resolveEmbeddingsWorkerSettings({
          EMBEDDINGS_CONCURRENCY: '2',
          EMBEDDINGS_RATE_LIMIT_DURATION_MS: '1000',
          EMBEDDINGS_RATE_LIMIT_MAX: '5',
        }),
      ).toEqual({ concurrency: 2, limiter: { duration: 1000, max: 5 } });
    });
  });

  describe('when the rate limit max is 0', () => {
    test('turns the limiter off', () => {
      expect(
        resolveEmbeddingsWorkerSettings({ EMBEDDINGS_RATE_LIMIT_MAX: '0' })
          .limiter,
      ).toBeUndefined();
    });
  });

  describe('when a value is invalid', () => {
    test.each(['0', '-1', '1.5', 'many'])(
      'falls back to the defaults for %j',
      (raw) => {
        const settings = resolveEmbeddingsWorkerSettings({
          EMBEDDINGS_CONCURRENCY: raw,
          EMBEDDINGS_RATE_LIMIT_DURATION_MS: raw,
        });

        expect(settings.concurrency).toBe(DEFAULT_EMBEDDINGS_CONCURRENCY);
        expect(settings.limiter?.duration).toBe(
          DEFAULT_EMBEDDINGS_RATE_LIMIT_DURATION_MS,
        );
      },
    );
  });
});
