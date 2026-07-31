import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import type { DailyStatsChartDatum } from '~/routing/dashboard/data/daily-stats-chart';

/** Formats YYYY-MM-DD for X-axis display (e.g. "Feb 11"). */
export const formatChartDate = (value: string): string => {
  const d = new Date(value + 'T00:00:00');

  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { dateStyle: 'full' });
};

/** Maps `DashboardDailyStatsCardFragment[]` to Recharts chart data. */
export const mapToChartData = (
  items: DashboardDailyStatsCardFragment[],
): DailyStatsChartDatum[] =>
  items.map((item) => ({
    date: item.date,
    plansCompleted: item.plansCompleted,
    plansCreated: item.plansCreated,
    plansUpdated: item.plansUpdated,
    tasksCompleted: item.tasksCompleted,
    tasksCreated: item.tasksCreated,
    tasksUpdated: item.tasksUpdated,
  }));
