import { describe, expect, test } from 'vitest';

import { buildCaptureHealthEntries, isCaptureStale } from '../capture-health';

const NOW_MS = new Date('2026-10-29T12:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

describe('isCaptureStale', () => {
  test('is false at exactly the threshold and true just past it', () => {
    const atThreshold = new Date(NOW_MS - DAY_MS).toISOString();
    const pastThreshold = new Date(NOW_MS - DAY_MS - 1).toISOString();

    expect(isCaptureStale(atThreshold, NOW_MS, DAY_MS)).toBe(false);
    expect(isCaptureStale(pastThreshold, NOW_MS, DAY_MS)).toBe(true);
  });

  describe('when the timestamp is unreadable', () => {
    test('counts as stale', () => {
      expect(isCaptureStale('not-a-date', NOW_MS, DAY_MS)).toBe(true);
    });
  });

  describe('when the timestamp is in the future (clock skew)', () => {
    test('is not stale', () => {
      const future = new Date(NOW_MS + DAY_MS).toISOString();

      expect(isCaptureStale(future, NOW_MS, DAY_MS)).toBe(false);
    });
  });
});

describe('buildCaptureHealthEntries', () => {
  test('orders stale first, then by stream and source, with a stable key', () => {
    const fresh = new Date(NOW_MS - 1000).toISOString();
    const stale = new Date(NOW_MS - 2 * DAY_MS).toISOString();

    const entries = buildCaptureHealthEntries(
      [
        { lastCapturedAt: fresh, source: 'cursor', stream: 'skill_events' },
        { lastCapturedAt: stale, source: 'claude', stream: 'token_usage' },
        {
          lastCapturedAt: fresh,
          source: 'claude-code',
          stream: 'skill_events',
        },
      ],
      NOW_MS,
      DAY_MS,
    );

    expect(entries.map((entry) => entry.key)).toEqual([
      'token_usage:claude',
      'skill_events:claude-code',
      'skill_events:cursor',
    ]);
    expect(entries.map((entry) => entry.stale)).toEqual([true, false, false]);
  });

  describe('when there are no rows', () => {
    test('returns an empty list', () => {
      expect(buildCaptureHealthEntries([], NOW_MS, DAY_MS)).toEqual([]);
    });
  });
});
