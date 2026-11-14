/** Length of the rolling window every Usage route reports on. */
const USAGE_RANGE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface UsageRange {
  /** `YYYY-MM-DD` upper bound, for resolvers that filter on dates. */
  readonly endDate: string;
  /** ISO timestamp upper bound, for resolvers that filter on instants. */
  readonly endIso: string;
  readonly rangeDays: number;
  /** `YYYY-MM-DD` lower bound, for resolvers that filter on dates. */
  readonly startDate: string;
  /** ISO timestamp lower bound, for resolvers that filter on instants. */
  readonly startIso: string;
}

/**
 * @description The rolling 30-day window ending at `now`, in both the ISO
 * timestamp form (`dailyStatsRange`) and the `YYYY-MM-DD` form (`tokenUsage`,
 * `skillUsage`) the Usage resolvers filter on. Shared by every Usage loader.
 */
export const getUsageRange = (now: Date = new Date()): UsageRange => {
  const endIso = now.toISOString();
  const startIso = new Date(
    now.getTime() - USAGE_RANGE_DAYS * MS_PER_DAY,
  ).toISOString();

  return {
    endDate: endIso.slice(0, 10),
    endIso,
    rangeDays: USAGE_RANGE_DAYS,
    startDate: startIso.slice(0, 10),
    startIso,
  };
};
