import type pg from 'pg';

import type {
  CapabilityProbe,
  ReportWindow,
  WindowCount,
} from '../../types/index.ts';

/**
 * @description Counts rows of a `plans`/`tasks` timestamp column that fall in
 * the report window, preferring `daily_stats`'s pre-aggregated per-day totals
 * over a live scan. `daily_stats` only ever holds *finished* UTC calendar
 * days (the aggregation job writes "yesterday"), so the window's trailing
 * edge — and, when `since` falls mid-day, its leading edge too — is almost
 * always live-counted even on a fully-populated table; only the interior full
 * days are read from `daily_stats`. Falls back to a single live count over
 * the whole window when the column is missing or a full day in range has no
 * row (a backfill gap), so the result is always correct, just sometimes
 * slower. The caller gets `source` back so the report can say which path ran.
 */

/** What {@link countInWindow} needs to know to run either strategy. */
export interface WindowCountQuery {
  /** The `daily_stats` column holding this metric's per-day total. */
  readonly dailyStatsColumn: string;
  readonly table: 'plans' | 'tasks';
  readonly timestampColumn: 'completed_at' | 'created_at';
}

function dayStartUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function liveCount(
  client: pg.Pool,
  query: WindowCountQuery,
  from: Date,
  to: Date,
): Promise<number> {
  if (from >= to) {
    return 0;
  }

  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM ${query.table}
     WHERE ${query.timestampColumn} >= $1 AND ${query.timestampColumn} < $2`,
    [from.toISOString(), to.toISOString()],
  );

  return rows[0]?.count ?? 0;
}

async function liveWindowCount(
  client: pg.Pool,
  query: WindowCountQuery,
  since: Date,
  until: Date,
): Promise<WindowCount> {
  return {
    count: await liveCount(client, query, since, until),
    source: 'live',
  };
}

/** Sums `query.dailyStatsColumn` over the window, falling back to a live count. See module doc. */
export async function countInWindow(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
  query: WindowCountQuery,
): Promise<WindowCount> {
  const since = new Date(window.since);
  const until = new Date(window.until);

  if (!probe.hasColumns('daily_stats', ['date', query.dailyStatsColumn])) {
    return liveWindowCount(client, query, since, until);
  }

  const sinceDayStart = dayStartUtc(since);
  const untilDayStart = dayStartUtc(until);
  const fullRangeStart = addDaysUtc(sinceDayStart, 1);
  const fullRangeEnd = untilDayStart;

  if (fullRangeStart >= fullRangeEnd) {
    return liveWindowCount(client, query, since, until);
  }

  const expectedDays = Math.round(
    (fullRangeEnd.getTime() - fullRangeStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  const { rows } = await client.query<{ value: number | null }>(
    `SELECT ${query.dailyStatsColumn} AS value FROM daily_stats
     WHERE date >= $1 AND date < $2`,
    [toYmd(fullRangeStart), toYmd(fullRangeEnd)],
  );

  if (rows.length !== expectedDays) {
    return liveWindowCount(client, query, since, until);
  }

  const middleSum = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);

  const [partialStart, partialEnd] = await Promise.all([
    liveCount(client, query, since, fullRangeStart),
    liveCount(client, query, fullRangeEnd, until),
  ]);

  const alignedStart = since.getTime() === sinceDayStart.getTime();
  const alignedEnd = until.getTime() === untilDayStart.getTime();

  return {
    count: middleSum + partialStart + partialEnd,
    source: alignedStart && alignedEnd ? 'daily_stats' : 'hybrid',
  };
}
