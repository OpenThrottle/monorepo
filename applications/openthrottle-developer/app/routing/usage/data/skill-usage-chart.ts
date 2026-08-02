/**
 * @description Chart config + datum shape for the skill-usage over-time
 * stacked bar chart (ours vs third-party per UTC day).
 */

import type { ChartConfig } from '@openthrottle/react-router-shadcn';

export interface SkillUsageChartDatum {
  date: string;
  oursCount: number;
  thirdPartyCount: number;
  totalCount: number;
}

export const SKILL_USAGE_CHART_CONFIG: ChartConfig = {
  oursCount: { color: 'var(--chart-1)', label: 'Ours' },
  thirdPartyCount: { color: 'var(--chart-4)', label: 'Third-party' },
};

/** Compact X-axis label: MM-DD from YYYY-MM-DD. */
export const formatSkillUsageChartDate = (date: string): string =>
  date.length >= 10 ? date.slice(5, 10) : date;
