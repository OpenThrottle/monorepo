import type pg from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  newPoolWithMockQuery,
  queryResult,
} from '../../../../tests/db/fake-pool.ts';
import type { CapabilityProbe } from '../../../types/index.ts';
import type { WindowCountQuery } from '../window-count.ts';
import { countInWindow } from '../window-count.ts';

function fakeProbe(hasDailyStats: boolean): CapabilityProbe {
  return {
    hasColumns: () => hasDailyStats,
    hasTable: () => hasDailyStats,
    tables: new Set(hasDailyStats ? ['daily_stats'] : []),
  };
}

/** A real (never-connecting) Pool whose `.query` returns a scripted sequence of results, one per call. */
function poolReturning(
  results: ReadonlyArray<{ rows: readonly unknown[] }>,
): pg.Pool {
  const { pool, query } = newPoolWithMockQuery();
  results.forEach((result) => {
    query.mockResolvedValueOnce(queryResult(result.rows));
  });
  return pool;
}

const QUERY: WindowCountQuery = {
  dailyStatsColumn: 'plans_created',
  table: 'plans',
  timestampColumn: 'created_at',
};

describe('countInWindow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to a live count when daily_stats lacks the needed column', async () => {
    const pool = poolReturning([{ rows: [{ count: 7 }] }]);

    const result = await countInWindow(
      pool,
      fakeProbe(false),
      { since: '2026-01-01T00:00:00.000Z', until: '2026-01-05T00:00:00.000Z' },
      QUERY,
    );

    expect(result).toEqual({ count: 7, source: 'live' });
  });

  it('falls back to live when the window is too short to contain a full interior day', async () => {
    const pool = poolReturning([{ rows: [{ count: 2 }] }]);

    const result = await countInWindow(
      pool,
      fakeProbe(true),
      {
        since: '2026-01-01T12:00:00.000Z',
        until: '2026-01-02T06:00:00.000Z',
      },
      QUERY,
    );

    expect(result).toEqual({ count: 2, source: 'live' });
  });

  it('falls back to live when daily_stats has a backfill gap (row count mismatch)', async () => {
    // since=Jan1, until=Jan5: 3 expected interior days, but daily_stats only
    // returns 1 row for them — the mismatch forces a full live re-count.
    const pool = poolReturning([
      { rows: [{ value: 5 }] },
      { rows: [{ count: 9 }] },
    ]);

    const result = await countInWindow(
      pool,
      fakeProbe(true),
      { since: '2026-01-01T00:00:00.000Z', until: '2026-01-05T00:00:00.000Z' },
      QUERY,
    );

    expect(result).toEqual({ count: 9, source: 'live' });
  });

  it('reports `daily_stats` when the window is exactly day-aligned and every interior day is present', async () => {
    // since=Jan1T00:00, until=Jan4T00:00: interior days are Jan2+Jan3 (the
    // leading day is always live-counted per countInWindow's doc comment,
    // even when aligned); the trailing edge is a zero-length live count that
    // never reaches the DB (fullRangeEnd === until).
    const pool = poolReturning([
      { rows: [{ value: 2 }, { value: 3 }] }, // daily_stats sum over the 2 interior days
      { rows: [{ count: 4 }] }, // partial start: live count for the leading day
    ]);

    const result = await countInWindow(
      pool,
      fakeProbe(true),
      { since: '2026-01-01T00:00:00.000Z', until: '2026-01-04T00:00:00.000Z' },
      QUERY,
    );

    expect(result).toEqual({ count: 9, source: 'daily_stats' });
  });

  it('reports `hybrid` when interior days come from daily_stats but the leading edge is mid-day', async () => {
    const pool = poolReturning([
      { rows: [{ value: 2 }, { value: 3 }] }, // daily_stats sum over the 2 interior days
      { rows: [{ count: 1 }] }, // partial start: live count for the mid-day leading edge
    ]);

    const result = await countInWindow(
      pool,
      fakeProbe(true),
      { since: '2026-01-01T12:00:00.000Z', until: '2026-01-04T00:00:00.000Z' },
      QUERY,
    );

    expect(result).toEqual({ count: 6, source: 'hybrid' });
  });
});
