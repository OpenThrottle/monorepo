/**
 * @description Chart config + datum shape for the skill-usage over-time
 * stacked bar chart (ours / personal / third-party per UTC day). Shared by the
 * /usage route and the /skills/$slug detail route.
 *
 * The series are keyed by the by-day count fields rather than by scope id, and
 * `SKILL_USAGE_CHART_SERIES` is the single ordered list the chart renders from
 * — so a new scope means adding one entry here, not editing the chart too.
 */

import type { ChartConfig } from '@openthrottle/react-router-shadcn';

export interface SkillUsageChartDatum {
  date: string;
  oursCount: number;
  personalCount: number;
  thirdPartyCount: number;
  totalCount: number;
}

export const SKILL_USAGE_CHART_CONFIG: ChartConfig = {
  oursCount: { color: 'var(--chart-1)', label: 'Ours' },
  personalCount: { color: 'var(--chart-2)', label: 'Personal' },
  thirdPartyCount: { color: 'var(--chart-4)', label: 'Third-party' },
};

/**
 * Stack order, bottom to top. The last entry carries the rounded cap, so the
 * chart reads the radius off the position rather than hardcoding which series
 * happens to be on top.
 */
export const SKILL_USAGE_FLAT_BAR_RADIUS: [number, number, number, number] = [
  0, 0, 0, 0,
];
export const SKILL_USAGE_TOP_BAR_RADIUS: [number, number, number, number] = [
  4, 4, 0, 0,
];

export const SKILL_USAGE_CHART_SERIES = [
  'oursCount',
  'personalCount',
  'thirdPartyCount',
] as const;
