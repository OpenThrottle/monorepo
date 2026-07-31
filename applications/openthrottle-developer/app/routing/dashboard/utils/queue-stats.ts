import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';
import { QUEUE_STATS_COLUMNS } from '~/routing/dashboard/data/queue-stats-columns';

/** Formats queue stats for a tooltip (full labels and counts). */
export const formatQueueStatsTooltip = (
  queue: DashboardQueueStatsCardFragment,
): string =>
  QUEUE_STATS_COLUMNS.map((col) => `${col.label}: ${queue[col.key]}`).join(
    ', ',
  );

/** Compact inline summary for a single queue (W:2 A:1 C:10 F:0 D:0). */
export const formatCompactSummary = (
  queue: DashboardQueueStatsCardFragment,
): string =>
  `W:${queue.waitingCount} A:${queue.activeCount} C:${queue.completedCount} F:${queue.failedCount} D:${queue.delayedCount}`;
