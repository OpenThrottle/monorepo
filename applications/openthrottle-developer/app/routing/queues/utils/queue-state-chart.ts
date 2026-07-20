import type { ChartConfig } from '@openthrottle/react-router-shadcn';
import type { QueueCardFragment } from '~/__generated__/graphql';

/** Recharts data keys for each job-state series (shared with the grouped stats chart). */
export const QUEUE_STATE_CHART_SERIES = [
  'waiting',
  'delayed',
  'active',
  'completed',
  'failed',
] as const;

export type QueueStateChartSeries = (typeof QUEUE_STATE_CHART_SERIES)[number];

/** View modes for the stacked state chart: one aggregate bar vs one bar per queue. */
export const QUEUE_STATE_CHART_VIEWS = ['aggregate', 'byQueue'] as const;

export type QueueStateChartView = (typeof QUEUE_STATE_CHART_VIEWS)[number];

/** @description Narrows an arbitrary string to a known chart view mode. */
export function isQueueStateChartView(
  value: string,
): value is QueueStateChartView {
  return QUEUE_STATE_CHART_VIEWS.some((view) => view === value);
}

/** Label for the single aggregate bar (all queues summed). */
export const QUEUE_STATE_CHART_AGGREGATE_LABEL = 'All queues';

/**
 * One stacked-bar row: a name plus all five state counts.
 * Same field set as the grouped stats chart datum so tooltips/config align.
 */
export interface QueueStateChartDatum {
  readonly active: number;
  readonly completed: number;
  readonly delayed: number;
  readonly failed: number;
  readonly name: string;
  readonly waiting: number;
}

/**
 * State → colour/label mapping. Intentionally identical to
 * {@link QUEUE_STATS_CHART_CONFIG} so both queue charts read consistently.
 */
export const QUEUE_STATE_CHART_CONFIG: ChartConfig = {
  active: { color: 'var(--chart-3)', label: 'In flight' },
  completed: { color: 'var(--chart-4)', label: 'Completed' },
  delayed: { color: 'var(--chart-2)', label: 'Delayed' },
  failed: { color: 'var(--chart-5)', label: 'Failed' },
  waiting: { color: 'var(--chart-1)', label: 'Waiting' },
};

/** @description Total jobs across every state for a single stacked-bar row. */
export function totalJobsForStateRow(row: QueueStateChartDatum): number {
  return row.active + row.completed + row.delayed + row.failed + row.waiting;
}

/**
 * @description Sums each state across all queues into a single stacked-bar datum.
 * Returns a zeroed row (still labelled) when there are no queues.
 */
export function queuesToAggregateStateDatum(
  queues: ReadonlyArray<QueueCardFragment>,
): QueueStateChartDatum {
  return queues.reduce<QueueStateChartDatum>(
    (totals, queue) => ({
      active: totals.active + queue.activeCount,
      completed: totals.completed + queue.completedCount,
      delayed: totals.delayed + queue.delayedCount,
      failed: totals.failed + queue.failedCount,
      name: QUEUE_STATE_CHART_AGGREGATE_LABEL,
      waiting: totals.waiting + queue.waitingCount,
    }),
    {
      active: 0,
      completed: 0,
      delayed: 0,
      failed: 0,
      name: QUEUE_STATE_CHART_AGGREGATE_LABEL,
      waiting: 0,
    },
  );
}

/**
 * @description Maps each queue to a stacked-bar row, sorted by total jobs
 * descending then name ascending (matches {@link queuesToStatsChartData}).
 */
export function queuesToPerQueueStateData(
  queues: ReadonlyArray<QueueCardFragment>,
): QueueStateChartDatum[] {
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
      const totalDiff = totalJobsForStateRow(b) - totalJobsForStateRow(a);
      if (totalDiff !== 0) {
        return totalDiff;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * @description Selects the chart rows for the active view: a single aggregate
 * datum, or one datum per queue.
 */
export function queueStateChartData(
  view: QueueStateChartView,
  queues: ReadonlyArray<QueueCardFragment>,
): QueueStateChartDatum[] {
  if (view === 'aggregate') {
    return [queuesToAggregateStateDatum(queues)];
  }
  return queuesToPerQueueStateData(queues);
}

/** Minimum height (px) for the stacked bar chart. */
export const QUEUE_STATE_CHART_MIN_HEIGHT = 300;

/** Approximate extra height (px) per bar so category labels stay legible. */
export const QUEUE_STATE_CHART_BAR_HEIGHT = 36;

/**
 * @description Scales chart height with the number of stacked bars so labels
 * and legend stay readable; never drops below the minimum.
 */
export function queueStateChartHeight(barCount: number): number {
  if (barCount <= 1) {
    return QUEUE_STATE_CHART_MIN_HEIGHT;
  }
  return Math.max(
    QUEUE_STATE_CHART_MIN_HEIGHT,
    barCount * QUEUE_STATE_CHART_BAR_HEIGHT + 96,
  );
}

/**
 * @description Compact numeric ticks for the job-count axis (e.g. 48200 → "48.2K").
 */
export function formatQueueStateChartTick(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}
