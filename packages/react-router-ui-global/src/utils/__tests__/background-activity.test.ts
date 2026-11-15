import { describe, expect, test } from 'vitest';

import { GLOBAL_BACKGROUND_ACTIVITY_COPY } from '../../data/data.copy';
import type { GlobalBackgroundActivity } from '../background-activity';
import {
  describeBackgroundActivity,
  formatShortDuration,
  secondsSince,
  summarizeBackgroundActivities,
} from '../background-activity';

const NOW = Date.parse('2026-11-15T18:30:00.000Z');

const activity = (
  overrides: Partial<GlobalBackgroundActivity> = {},
): GlobalBackgroundActivity => {
  return {
    done: 1240,
    etaSeconds: 3840,
    id: 'embeddings_backfill:code',
    label: 'Embedding code chunks',
    startedAt: '2026-11-15T18:18:00.000Z',
    status: 'running',
    total: 5560,
    ...overrides,
  };
};

describe('summarizeBackgroundActivities', () => {
  test('sums done and total across activities', () => {
    expect(
      summarizeBackgroundActivities([
        activity({ done: 30, total: 100 }),
        activity({ done: 20, id: 'b', total: 100 }),
      ]),
    ).toEqual({ done: 50, percent: 25, total: 200 });
  });

  test('is indeterminate when any total is unknown', () => {
    expect(
      summarizeBackgroundActivities([
        activity({ done: 30, total: 100 }),
        activity({ done: 5, id: 'b', total: null }),
      ]),
    ).toEqual({ done: 35, percent: null, total: null });
  });

  test('is indeterminate when the total is zero', () => {
    expect(
      summarizeBackgroundActivities([activity({ done: 0, total: 0 })]).percent,
    ).toBeNull();
  });

  test('clamps the percentage to 100', () => {
    expect(
      summarizeBackgroundActivities([activity({ done: 120, total: 100 })])
        .percent,
    ).toBe(100);
  });
});

describe('formatShortDuration', () => {
  test.each([
    [-5, '0s'],
    [45, '45s'],
    [720, '12m'],
    [3600, '1h'],
    [3900, '1h 5m'],
    [86_400, '1d'],
    [97_200, '1d 3h'],
  ])('formats %s seconds as %s', (seconds, expected) => {
    expect(formatShortDuration(seconds)).toBe(expected);
  });
});

describe('secondsSince', () => {
  test('measures from an ISO timestamp', () => {
    expect(secondsSince('2026-11-15T18:29:00.000Z', NOW)).toBe(60);
  });

  test('is null for a value that does not parse', () => {
    expect(secondsSince('not a date', NOW)).toBeNull();
  });
});

describe('describeBackgroundActivity', () => {
  const copy = GLOBAL_BACKGROUND_ACTIVITY_COPY;

  test('reads done / total, elapsed and ETA', () => {
    expect(describeBackgroundActivity(activity(), NOW)).toEqual({
      detail: [
        '1,240 / 5,560',
        `${copy.started} 12m ${copy.ago}`,
        `~1h 4m ${copy.left}`,
      ].join(copy.separator),
      id: 'embeddings_backfill:code',
      label: 'Embedding code chunks',
    });
  });

  test('says it is still estimating until the server has an ETA', () => {
    expect(
      describeBackgroundActivity(activity({ etaSeconds: null }), NOW).detail,
    ).toContain(copy.estimating);
  });

  test('says it is stalled instead of an ETA', () => {
    const { detail } = describeBackgroundActivity(
      activity({ status: 'stalled' }),
      NOW,
    );

    expect(detail).toContain(copy.stalled);
    expect(detail).not.toContain(copy.left);
  });

  test('shows only done when the total is unknown', () => {
    expect(
      describeBackgroundActivity(activity({ total: null }), NOW).detail,
    ).toMatch(/^1,240 · /);
  });
});
