/**
 * @description Formatting helpers for the per-skill usage detail surface on
 * /skills/$slug (the prop shapes live in `~/routing/skills/types`).
 */

/**
 * Success rate over REPORTED QUALITY outcomes (success + error); em dash when
 * none were reported. The denominator deliberately excludes session-end and
 * abandoned records — dividing by those would let a skill nobody measured show
 * a confident percentage built entirely out of "the session finished".
 */
export const skillUsageSuccessRateLabel = (
  successCount: number,
  outcomeCount: number,
): string => {
  if (outcomeCount <= 0) return '—';

  return `${Math.round((successCount / outcomeCount) * 100)}%`;
};

/** Relative "last used" label (e.g. "3 days ago"); "Never" when absent. */
export const skillUsageLastUsedLabel = (
  iso: string | null,
  nowMs: number = Date.now(),
): string => {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';

  const deltaSeconds = Math.round((then - nowMs) / 1000);
  const abs = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 60) {
    return formatter.format(deltaSeconds, 'second');
  }

  if (abs < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), 'minute');
  }

  if (abs < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), 'hour');
  }

  return formatter.format(Math.round(deltaSeconds / 86400), 'day');
};
