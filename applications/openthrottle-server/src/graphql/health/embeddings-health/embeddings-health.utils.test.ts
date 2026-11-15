import { describe, expect, test } from 'vitest';

import type { EmbeddingCoverage } from './embeddings-health.types.ts';
import {
  classifyEmbeddingsHealth,
  coverageRatio,
  resolveEmbeddingsHealthThresholds,
} from './embeddings-health.utils.ts';

const THRESHOLDS = { maxQueueBacklog: 500, minCoverage: 0.99 };

function table(embedded: number, total: number): EmbeddingCoverage {
  return {
    embedded,
    entity: 'plan',
    stale: 0,
    table: 'plan_embeddings',
    total,
  };
}

describe('resolveEmbeddingsHealthThresholds', () => {
  test('defaults to 99% coverage and a 500-job backlog', () => {
    expect(resolveEmbeddingsHealthThresholds({})).toEqual(THRESHOLDS);
  });

  test('reads overrides and caps coverage at 1', () => {
    expect(
      resolveEmbeddingsHealthThresholds({
        EMBEDDINGS_HEALTH_MAX_BACKLOG: '50',
        EMBEDDINGS_HEALTH_MIN_COVERAGE: '1.5',
      }),
    ).toEqual({ maxQueueBacklog: 50, minCoverage: 1 });
  });

  test('falls back on invalid values', () => {
    expect(
      resolveEmbeddingsHealthThresholds({
        EMBEDDINGS_HEALTH_MAX_BACKLOG: '-1',
        EMBEDDINGS_HEALTH_MIN_COVERAGE: 'most',
      }),
    ).toEqual(THRESHOLDS);
  });
});

describe('coverageRatio', () => {
  test('treats an empty table as fully covered', () => {
    expect(coverageRatio(table(0, 0))).toBe(1);
  });
});

describe('classifyEmbeddingsHealth', () => {
  test.each(['unconfigured', 'dimension_mismatch'] as const)(
    'is unconfigured when the embedder is %s',
    (state) => {
      expect(
        classifyEmbeddingsHealth(state, [table(100, 100)], 0, THRESHOLDS),
      ).toBe('unconfigured');
    },
  );

  test('is degraded below the coverage threshold', () => {
    expect(
      classifyEmbeddingsHealth(
        'ok',
        [table(100, 100), table(98, 100)],
        0,
        THRESHOLDS,
      ),
    ).toBe('degraded');
  });

  test('is degraded above the queue backlog threshold', () => {
    expect(
      classifyEmbeddingsHealth('ok', [table(100, 100)], 501, THRESHOLDS),
    ).toBe('degraded');
  });

  test('is degraded while the provider errors', () => {
    expect(
      classifyEmbeddingsHealth(
        'provider_error',
        [table(100, 100)],
        0,
        THRESHOLDS,
      ),
    ).toBe('degraded');
  });

  test('is ok at full coverage with a small backlog, even while starting', () => {
    expect(
      classifyEmbeddingsHealth('starting', [table(99, 100)], null, THRESHOLDS),
    ).toBe('ok');
  });
});
