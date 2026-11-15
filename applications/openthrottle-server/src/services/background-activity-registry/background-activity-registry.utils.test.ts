/**
 * @description Tests for the registry's pure helpers: parsing what Redis stores, the smoothed
 * throughput, the ETA it implies, and the running/stalled status.
 */

import { describe, expect, it } from 'vitest';

import {
  BACKGROUND_ACTIVITY_MIN_INTERVAL_MS,
  BACKGROUND_ACTIVITY_STALLED_AFTER_MS,
} from './background-activity-registry.constants.ts';
import type {
  BackgroundActivityRecord,
  BackgroundActivitySample,
} from './background-activity-registry.types.ts';
import {
  computeEtaSeconds,
  computeSmoothedRate,
  parseBackgroundActivityRecord,
  parseBackgroundActivitySamples,
  resolveBackgroundActivityStatus,
  toBackgroundActivitySnapshot,
} from './background-activity-registry.utils.ts';

const START = 1_700_000_000_000;

/** Samples every `stepMs`, `perStep` units apart. */
const steadySamples = (
  count: number,
  stepMs: number,
  perStep: number,
): BackgroundActivitySample[] => {
  return Array.from({ length: count }, (_, index) => {
    return { at: START + index * stepMs, done: index * perStep };
  });
};

const record = (
  overrides: Partial<BackgroundActivityRecord> = {},
): BackgroundActivityRecord => {
  return {
    done: 0,
    id: 'embeddings_backfill:code',
    kind: 'embeddings_backfill',
    label: 'Re-embedding code chunks',
    progressedAt: START,
    startedAt: START,
    total: 100,
    ...overrides,
  };
};

describe('parseBackgroundActivityRecord', () => {
  it('reads a stored hash', () => {
    expect(
      parseBackgroundActivityRecord({
        done: '40',
        id: 'embeddings_backfill:code',
        kind: 'embeddings_backfill',
        label: 'Re-embedding code chunks',
        progressedAt: String(START + 5000),
        startedAt: String(START),
        total: '100',
      }),
    ).toEqual(record({ done: 40, progressedAt: START + 5000 }));
  });

  it('reads an empty total as unknown', () => {
    expect(
      parseBackgroundActivityRecord({
        done: '0',
        id: 'a',
        kind: 'embeddings_backfill',
        label: 'x',
        startedAt: String(START),
        total: '',
      }),
    ).toMatchObject({ progressedAt: START, total: null });
  });

  it('drops an expired (empty) hash', () => {
    expect(parseBackgroundActivityRecord({})).toBeUndefined();
  });

  it('drops an unknown kind', () => {
    expect(
      parseBackgroundActivityRecord({
        done: '0',
        id: 'a',
        kind: 'not_a_kind',
        label: 'x',
        startedAt: String(START),
      }),
    ).toBeUndefined();
  });
});

describe('parseBackgroundActivitySamples', () => {
  it('returns samples oldest first and skips malformed entries', () => {
    expect(
      parseBackgroundActivitySamples([
        `${START + 2000}:20`,
        'garbage',
        `${START}:0`,
      ]),
    ).toEqual([
      { at: START, done: 0 },
      { at: START + 2000, done: 20 },
    ]);
  });
});

describe('computeSmoothedRate', () => {
  it('returns null with no samples', () => {
    expect(computeSmoothedRate([])).toBeNull();
  });

  it('returns null until there are enough intervals', () => {
    expect(computeSmoothedRate(steadySamples(2, 10_000, 10))).toBeNull();
  });

  it('returns the steady rate in units per second', () => {
    expect(computeSmoothedRate(steadySamples(5, 10_000, 10))).toBeCloseTo(1);
  });

  it('merges samples closer than the minimum interval', () => {
    const burst: BackgroundActivitySample[] = [
      { at: START, done: 0 },
      { at: START + 1, done: 100 },
      { at: START + BACKGROUND_ACTIVITY_MIN_INTERVAL_MS, done: 100 },
      { at: START + 2 * BACKGROUND_ACTIVITY_MIN_INTERVAL_MS, done: 200 },
    ];

    // Two 5s intervals of 100 units each: 20/s, not the 100000/s of the 1ms burst.
    expect(computeSmoothedRate(burst)).toBeCloseTo(20);
  });

  it('weights recent intervals more than old ones', () => {
    const slowThenFast: BackgroundActivitySample[] = [
      { at: START, done: 0 },
      { at: START + 10_000, done: 10 },
      { at: START + 20_000, done: 20 },
      { at: START + 30_000, done: 120 },
    ];
    const rate = computeSmoothedRate(slowThenFast);

    expect(rate).not.toBeNull();
    expect(rate).toBeGreaterThan(1);
    expect(rate).toBeLessThan(10);
  });
});

describe('computeEtaSeconds', () => {
  it('divides what is left by the rate, rounding up', () => {
    expect(computeEtaSeconds(40, 100, 7)).toBe(9);
  });

  it('is null with no total', () => {
    expect(computeEtaSeconds(40, null, 7)).toBeNull();
  });

  it('is null with no rate yet', () => {
    expect(computeEtaSeconds(40, 100, null)).toBeNull();
  });

  it('is null with a zero rate', () => {
    expect(computeEtaSeconds(40, 100, 0)).toBeNull();
  });

  it('is 0 once done reaches total', () => {
    expect(computeEtaSeconds(120, 100, null)).toBe(0);
  });
});

describe('resolveBackgroundActivityStatus', () => {
  it('is running while progress is recent', () => {
    expect(resolveBackgroundActivityStatus(START, START + 1000)).toBe(
      'running',
    );
  });

  it('is stalled after the stall window', () => {
    expect(
      resolveBackgroundActivityStatus(
        START,
        START + BACKGROUND_ACTIVITY_STALLED_AFTER_MS + 1,
      ),
    ).toBe('stalled');
  });
});

describe('toBackgroundActivitySnapshot', () => {
  it('serves done, total, startedAt and an ETA for a running activity', () => {
    const samples = steadySamples(5, 10_000, 10);
    const now = START + 40_000;

    expect(
      toBackgroundActivitySnapshot(
        record({ done: 40, progressedAt: now }),
        samples,
        now,
      ),
    ).toEqual({
      done: 40,
      etaSeconds: 60,
      id: 'embeddings_backfill:code',
      kind: 'embeddings_backfill',
      label: 'Re-embedding code chunks',
      startedAt: new Date(START),
      status: 'running',
      total: 100,
    });
  });

  it('clamps done to total', () => {
    expect(
      toBackgroundActivitySnapshot(record({ done: 130 }), [], START).done,
    ).toBe(100);
  });

  it('offers no ETA while stalled', () => {
    const now = START + BACKGROUND_ACTIVITY_STALLED_AFTER_MS + 1;

    expect(
      toBackgroundActivitySnapshot(
        record({ done: 40 }),
        steadySamples(5, 10_000, 10),
        now,
      ),
    ).toMatchObject({ etaSeconds: null, status: 'stalled' });
  });

  it('offers no ETA when total is unknown', () => {
    expect(
      toBackgroundActivitySnapshot(
        record({ done: 40, total: null }),
        steadySamples(5, 10_000, 10),
        START + 40_000,
      ),
    ).toMatchObject({ done: 40, etaSeconds: null, total: null });
  });
});
