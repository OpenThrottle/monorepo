import type { ChartConfig } from '@openthrottle/react-router-shadcn';
import type { QueueCardFragment } from '~/__generated__/graphql';

/** Recharts data keys for each job-count series (aligned with the queues table). */
export const QUEUE_STATS_CHART_SERIES = [
  'waiting',
  'delayed',
  'active',
  'completed',
  'failed',
] as const;

/** One row per queue: name plus all five count series for grouped bar charts. */
interface QueueStatsChartDatum {
  readonly active: number;
  readonly completed: number;
  readonly delayed: number;
  readonly failed: number;
  readonly name: string;
  readonly waiting: number;
}

export const QUEUE_STATS_CHART_CONFIG: ChartConfig = {
  active: { color: 'var(--chart-3)', label: 'In flight' },
  completed: { color: 'var(--chart-4)', label: 'Completed' },
  delayed: { color: 'var(--chart-2)', label: 'Delayed' },
  failed: { color: 'var(--chart-5)', label: 'Failed' },
  waiting: { color: 'var(--chart-1)', label: 'Waiting' },
};

/**
 * @description Waiting + delayed jobs — same semantics as the queues table backlog column.
 */
export function backlogForQueue(queue: QueueCardFragment): number {
  return queue.waitingCount + queue.delayedCount;
}

function totalJobsForChartRow(row: QueueStatsChartDatum): number {
  return row.waiting + row.delayed + row.active + row.completed + row.failed;
}

/**
 * @description Maps queue stats to chart rows with every QueueCard count, sorted by total jobs descending then name.
 */
export function queuesToStatsChartData(
  queues: ReadonlyArray<QueueCardFragment>,
): QueueStatsChartDatum[] {
  return [...queues]
    .map((queue) => ({
      active: queue.activeCount,
      completed: queue.completedCount,
      delayed: queue.delayedCount,
      failed: queue.failedCount,
      name: queue.name,
      waiting: queue.waitingCount,
    }))
    .sort((a, b) => {
      const totalDiff = totalJobsForChartRow(b) - totalJobsForChartRow(a);
      if (totalDiff !== 0) {
        return totalDiff;
      }
      return a.name.localeCompare(b.name);
    });
}
