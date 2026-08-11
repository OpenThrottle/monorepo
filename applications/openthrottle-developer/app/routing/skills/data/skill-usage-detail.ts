/**
 * @description Prop shapes + formatting helpers for the per-skill usage detail
 * surface on /skills/$slug. Mirrors the `skillUsage` bySkill row (single skill)
 * plus the shared daily series, and degrades to an `unavailable` state when the
 * query could not be loaded (no settings:read permission, or a server error).
 */

import type { SkillUsageChartDatum } from '~/global/data/skill-usage-chart';

/** One skill's aggregates over the range — shaped like the bySkill fragment. */
export interface SkillDetailUsageSkillStats {
  readonly abandonedCount: number;
  readonly avgDurationMs: number | null;
  readonly count: number;
  readonly errorCount: number;
  /** ISO timestamp of the most recent invocation in range; null when none. */
  readonly lastUsedAt: string | null;
  readonly outcomeCount: number;
  readonly scope: string;
  readonly skillName: string;
  readonly successCount: number;
}

/**
 * Discriminated usage state for the detail card:
 * - `available: false` → the query failed/was unauthorized (unavailable notice).
 * - `available: true, skill: null` → skill exists on disk but no invocations in
 *   range (empty state).
 * - `available: true, skill: {...}` → populated.
 */
export type SkillDetailUsageData =
  | { readonly available: false }
  | {
      readonly available: true;
      readonly byDay: readonly SkillUsageChartDatum[];
      readonly skill: SkillDetailUsageSkillStats | null;
    };

/** Success rate over reported outcomes; em dash when no outcomes reported. */
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
