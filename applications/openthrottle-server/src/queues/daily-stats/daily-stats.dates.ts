/**
 * @description Pure UTC calendar-day helpers for daily stats aggregation and
 * gap backfill. A "ymd" is a `YYYY-MM-DD` string interpreted in UTC. Kept free
 * of NestJS/TypeORM so the aggregation bounds and gap enumeration are trivially
 * unit-testable.
 */

/**
 * @description Normalizes a Postgres `date` value (pg returns a `YYYY-MM-DD`
 * string; TypeORM may hand back a `Date`) to a UTC `YYYY-MM-DD` string.
 */
export function toYmd(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * @description Returns the `[dayStart, dayEnd)` UTC boundaries for a target ymd.
 * `dayStart` is 00:00:00.000Z of the date; `dayEnd` is 00:00:00.000Z of the next
 * day, so range predicates use `>= dayStart AND < dayEnd`.
 */
export function getUtcDayBounds(dateYmd: string): {
  dayEnd: Date;
  dayStart: Date;
} {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { dayEnd, dayStart };
}

/**
 * @description Returns the previous calendar day (UTC) as a ymd string, relative
 * to `now` (defaults to the current instant). This is the day the scheduled 6am
 * UTC job aggregates.
 */
export function getPreviousUtcDayYmd(now: Date = new Date()): string {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  todayStart.setUTCDate(todayStart.getUTCDate() - 1);

  return toYmd(todayStart);
}

/**
 * @description Adds `days` (may be negative) to a ymd and returns the resulting
 * ymd, all in UTC.
 */
export function addUtcDaysToYmd(ymd: string, days: number): string {
  const { dayStart } = getUtcDayBounds(ymd);
  dayStart.setUTCDate(dayStart.getUTCDate() + days);

  return toYmd(dayStart);
}

/**
 * @description Enumerates every ymd from `startYmd` to `endYmd` inclusive, in
 * chronological order. Returns `[]` when `startYmd` is after `endYmd`. Relies on
 * zero-padded ISO ymds comparing correctly as strings.
 */
export function enumerateYmdRange(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  while (cur <= endYmd) {
    out.push(cur);
    cur = addUtcDaysToYmd(cur, 1);
  }

  return out;
}
