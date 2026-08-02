import type { ContributionHeatmapValue } from '@openthrottle/react-router-shadcn';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

/**
 * Sums the six plan + task counts on a daily-stats row into a single
 * "total activity" value for the contributions heatmap.
 */
export const sumDailyStatActivity = (
  item: DashboardDailyStatsCardFragment,
): number =>
  item.plansCompleted +
  item.plansCreated +
  item.plansUpdated +
  item.tasksCompleted +
  item.tasksCreated +
  item.tasksUpdated;

/**
 * Maps `DashboardDailyStatsCardFragment[]` to `ContributionHeatmap` values,
 * where each day's `count` is its total plan + task activity.
 */
export const mapDailyStatsToContributions = (
  items: DashboardDailyStatsCardFragment[],
): ContributionHeatmapValue[] =>
  items.map((item) => ({ count: sumDailyStatActivity(item), date: item.date }));
