import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

/** Search param (YYYY-MM-DD) carrying the day selected from the activity chart. */
export const SELECTED_DATE_PARAM = 'date';

/**
 * @description Reads the selected day (`date` search param) used by the daily-stats details modal.
 */
export function parseSelectedStatDate(
  searchParams: URLSearchParams,
): string | null {
  const value = searchParams.get(SELECTED_DATE_PARAM);

  return value === null || value === '' ? null : value;
}

/**
 * @description Returns a `YYYY-MM-DD` date string shifted by `deltaDays`, computed in UTC so
 * it never drifts across DST/timezone boundaries. Returns the input unchanged when it isn't a
 * valid `YYYY-MM-DD` value.
 */
export function shiftIsoDate(date: string, deltaDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (match === null) {
    return date;
  }

  const [, year, month, day] = match;
  const base = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const shifted = new Date(base + deltaDays * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getUTCFullYear().toString().padStart(4, '0');
  const mm = (shifted.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getUTCDate().toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @description Resolves the clicked day's date from a chart bar's active index, or null
 * when the index is missing/out of range. Pure so the bar-click behaviour is testable
 * without recharts geometry (jsdom reports no element size).
 */
export function resolveDateFromActiveIndex(
  items: readonly DashboardDailyStatsCardFragment[],
  activeIndex: number | string | null | undefined,
): string | null {
  if (activeIndex === null || activeIndex === undefined) {
    return null;
  }

  return items[Number(activeIndex)]?.date ?? null;
}

/**
 * @description Resolves the daily-stats row matching `date`, or null when absent/unmatched.
 */
export function selectDailyStatByDate(
  items: readonly DashboardDailyStatsCardFragment[],
  date: string | null,
): DashboardDailyStatsCardFragment | null {
  if (date === null) {
    return null;
  }

  return items.find((item) => item.date === date) ?? null;
}

/**
 * @description Returns the most-recent day in the range (fallback when no date is selected).
 */
export function selectMostRecentDailyStat(
  items: readonly DashboardDailyStatsCardFragment[],
): DashboardDailyStatsCardFragment | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((latest, item) =>
    item.date > latest.date ? item : latest,
  );
}
