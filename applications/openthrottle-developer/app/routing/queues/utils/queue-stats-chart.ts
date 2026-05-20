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

/** @description Largest single-series value in chart rows (sets grouped BarChart X-axis max). */
function maxSingleSeriesValue(
  rows: ReadonlyArray<QueueStatsChartDatum>,
): number {
  return maxSingleSeriesForView(rows, true);
}

/**
 * @description Largest value among series included in the chart view (operational vs all five).
 */
export function maxSingleSeriesForView(
  rows: ReadonlyArray<QueueStatsChartDatum>,
  includeCompleted: boolean,
): number {
  const keys = seriesKeysForQueueStatsView(includeCompleted);
  let max = 0;
  for (const row of rows) {
    for (const key of keys) {
      if (row[key] > max) {
        max = row[key];
      }
    }
  }
  return max;
}

/**
 * @description Convenience wrapper: max single-series value for queue fragments in a given view.
 */
export function maxSingleSeriesForQueues(
  queues: ReadonlyArray<QueueCardFragment>,
  includeCompleted: boolean,
): number {
  return maxSingleSeriesForView(
    queuesToStatsChartData(queues),
    includeCompleted,
  );
}

/**
 * @description Representative local/staging skew: `plans` completed history dwarfs backlog on other queues.
 * Used by audit tests and chart redesign success criteria (plan 1314b9bd-b286-4097-92af-43cf0f32d76a).
 */
export const REPRESENTATIVE_SKEWED_QUEUES: ReadonlyArray<QueueCardFragment> = [
  {
    __typename: 'QueueStatsObject',
    activeCount: 2,
    completedCount: 48_200,
    delayedCount: 0,
    failedCount: 14,
    name: 'plans',
    waitingCount: 0,
  },
  {
    __typename: 'QueueStatsObject',
    activeCount: 1,
    completedCount: 340,
    delayedCount: 4,
    failedCount: 0,
    name: 'embeddings-ingest',
    waitingCount: 22,
  },
  {
    __typename: 'QueueStatsObject',
    activeCount: 0,
    completedCount: 89,
    delayedCount: 2,
    failedCount: 1,
    name: 'default',
    waitingCount: 11,
  },
];

export interface QueuesChartSkewAnalysis {
  readonly backlogByQueue: ReadonlyArray<{
    readonly backlog: number;
    readonly name: string;
  }>;
  readonly dominantQueue: string;
  readonly dominantSeries: (typeof QUEUE_STATS_CHART_SERIES)[number];
  readonly dominantSeriesValue: number;
  readonly maxSingleSeries: number;
  readonly nonDominantBacklogMax: number;
  readonly nonDominantBacklogToAxisRatio: number;
  readonly rows: ReadonlyArray<QueueStatsChartDatum>;
}

/**
 * @description Quantifies how one queue/series dominates the shared grouped-bar X scale.
 */
export function analyzeQueuesChartSkew(
  queues: ReadonlyArray<QueueCardFragment>,
): QueuesChartSkewAnalysis {
  const rows = queuesToStatsChartData(queues);
  const maxSingleSeries = maxSingleSeriesValue(rows);

  let dominantSeries: (typeof QUEUE_STATS_CHART_SERIES)[number] =
    QUEUE_STATS_CHART_SERIES[0];
  let dominantSeriesValue = 0;
  let dominantQueue = rows[0]?.name ?? '';

  for (const row of rows) {
    for (const key of QUEUE_STATS_CHART_SERIES) {
      if (row[key] > dominantSeriesValue) {
        dominantSeriesValue = row[key];
        dominantSeries = key;
        dominantQueue = row.name;
      }
    }
  }

  const backlogByQueue = rows.map((row) => ({
    backlog: row.waiting + row.delayed,
    name: row.name,
  }));

  const nonDominantBacklogMax = backlogByQueue
    .filter((entry) => entry.name !== dominantQueue)
    .reduce((max, entry) => Math.max(max, entry.backlog), 0);

  const nonDominantBacklogToAxisRatio =
    maxSingleSeries === 0 ? 1 : nonDominantBacklogMax / maxSingleSeries;

  return {
    backlogByQueue,
    dominantQueue,
    dominantSeries,
    dominantSeriesValue,
    maxSingleSeries,
    nonDominantBacklogMax,
    nonDominantBacklogToAxisRatio,
    rows,
  };
}

/**
 * Measurable goals for QueuesStats chart redesign (plan 1314b9bd-b286-4097-92af-43cf0f32d76a).
 *
 * 1. **Non-plan backlog readable:** With {@link REPRESENTATIVE_SKEWED_QUEUES}, non-`plans` backlog bars are visually distinguishable without hover (target: backlog segment ≥ ~8px or ≥5% of chart width at 320px+).
 * 2. **Cross-queue backlog comparable:** Operators can rank backlog (waiting + delayed) across queues in the default view without mental rescaling from a 40k+ completed bar.
 * 3. **Tooltip parity:** Any filtered or transformed default view still exposes all five table counts on hover/focus (same fields as `QueueCard` / `QueuesTable`).
 */
export const QUEUE_STATS_CHART_SUCCESS_CRITERIA = [
  'Non-plan queues: backlog (waiting + delayed) readable without hover when plans completed dominates scale.',
  'Cross-queue backlog ranking visible in the default chart view.',
  'Tooltips (or equivalent) still show all five counts per queue aligned with the table.',
] as const;

/** Series shown in the default “operations” view (excludes historical completed volume). */
export const QUEUE_STATS_CHART_OPERATIONAL_SERIES = [
  'waiting',
  'delayed',
  'active',
  'failed',
] as const satisfies ReadonlyArray<(typeof QUEUE_STATS_CHART_SERIES)[number]>;

export type QueueStatsChartViewVerdict =
  | 'finalist'
  | 'alternative'
  | 'rejected';

export interface QueueStatsChartViewOption {
  readonly cons: readonly string[];
  readonly id: string;
  readonly label: string;
  readonly meetsSuccessCriteria: {
    readonly backlogReadable: boolean;
    readonly crossQueueComparable: boolean;
    readonly tooltipParity: boolean;
  };
  readonly pros: readonly string[];
  readonly summary: string;
  readonly verdict: QueueStatsChartViewVerdict;
}

/**
 * @description Evaluation of chart approaches for skewed queue volumes (task 523146e3-b36c-479a-8e1a-25ecd1d57631).
 *
 * Prior art: {@link DashboardQueueStats} on the dashboard index uses a compact list + shadcn Tooltip for all five
 * counts (no shared bar scale). QueuesStats keeps a grouped BarChart for cross-queue comparison; the fix must
 * preserve that while taming `plans` / high-volume `completed` on a single X-axis.
 */
export const QUEUE_STATS_CHART_VIEW_OPTIONS: ReadonlyArray<QueueStatsChartViewOption> =
  [
    {
      cons: [
        'Completed volume hidden until toggled (acceptable for ops-focused default).',
        'Requires a small control and copy update under the heading.',
      ],
      id: 'operational-default-with-completed-toggle',
      label: 'Default operational series + “Show completed” toggle',
      meetsSuccessCriteria: {
        backlogReadable: true,
        crossQueueComparable: true,
        tooltipParity: true,
      },
      pros: [
        'Directly removes the dominant series (`completed` on `plans`) from the shared scale.',
        'Keeps one chart, grouped bars, and table field parity via tooltip for all five counts.',
        'Minimal vertical space; works on narrow viewports.',
        'Aligns with operator focus: backlog (waiting + delayed) and in-flight (active).',
      ],
      summary:
        'Default BarChart uses waiting, delayed, active, failed only; optional toggle adds completed to the grouped bars. Tooltip always lists all five counts (same pattern as DashboardQueueStats tooltips).',
      verdict: 'finalist',
    },
    {
      cons: [
        'Roughly doubles chart height (two BarCharts or stacked sections).',
        'Completed chart still skewed if multiple high-volume queues; less critical than mixing with backlog.',
      ],
      id: 'dual-chart-operations-and-completed',
      label: 'Split charts: operations vs completed history',
      meetsSuccessCriteria: {
        backlogReadable: true,
        crossQueueComparable: true,
        tooltipParity: true,
      },
      pros: [
        'No toggle; both operational and historical views visible at once.',
        'Each chart has its own X scale — operations chart compares backlog/active across queues.',
        'Reuses the same ChartContainer + series config twice with different `dataKey` subsets.',
      ],
      summary:
        'Top chart: waiting, delayed, active, failed. Bottom chart: completed only (sorted by completed desc). Same row order / queue names for scanability.',
      verdict: 'finalist',
    },
    {
      cons: [
        'Log scale is hard to read for exact counts; fails “at-a-glance” backlog ranking.',
        'Recharts log axis breaks on zero values (common for waiting/failed).',
        'Accessibility: non-linear scale is unfamiliar for ops tooling.',
      ],
      id: 'log-scale-all-series',
      label: 'Log / symlog X-axis (all five series)',
      meetsSuccessCriteria: {
        backlogReadable: false,
        crossQueueComparable: false,
        tooltipParity: true,
      },
      pros: ['Single chart, all series always visible.'],
      summary:
        'Compresses large `completed` values on a log X-axis while keeping five grouped series.',
      verdict: 'rejected',
    },
    {
      cons: [
        'Destroys cross-queue comparison (primary QueuesStats goal).',
        'High vertical cost (N mini-charts × legend).',
        'Poor mobile layout unless horizontally scrolled.',
      ],
      id: 'small-multiples',
      label: 'Small multiples (per-queue chart, independent scale)',
      meetsSuccessCriteria: {
        backlogReadable: true,
        crossQueueComparable: false,
        tooltipParity: true,
      },
      pros: ['Each queue readable in isolation.'],
      summary:
        'One mini grouped bar chart per queue with an independent X max.',
      verdict: 'rejected',
    },
    {
      cons: [
        'Shows composition, not absolute backlog — cannot rank 26 vs 13 waiting+delayed.',
        'Fails measurable goal #2 (cross-queue backlog comparable).',
      ],
      id: 'percent-stacked',
      label: 'Percent stacked bars per queue',
      meetsSuccessCriteria: {
        backlogReadable: false,
        crossQueueComparable: false,
        tooltipParity: true,
      },
      pros: ['Highlights mix of states within one queue.'],
      summary: 'Each row stacks to 100% by series share within that queue.',
      verdict: 'rejected',
    },
    {
      cons: [
        'Hides `plans` from the default story; operators may miss runner health on that queue.',
        'Does not help if two queues both have large completed counts.',
        '“Expand” interaction adds state without fixing mixed-scale semantics.',
      ],
      id: 'exclude-dominant-queue',
      label: 'Hide / pin high-volume queue with expand',
      meetsSuccessCriteria: {
        backlogReadable: true,
        crossQueueComparable: true,
        tooltipParity: true,
      },
      pros: ['Simple filter when one queue is always the outlier.'],
      summary: 'Omit `plans` (or top row) from chart until expanded.',
      verdict: 'alternative',
    },
    {
      cons: [
        'Arbitrary cap; skew remains among shown queues if completed is included.',
        'Does not address within-chart scale when `plans` is shown.',
      ],
      id: 'sort-limit-queues',
      label: 'Cap or paginate displayed queues',
      meetsSuccessCriteria: {
        backlogReadable: false,
        crossQueueComparable: false,
        tooltipParity: true,
      },
      pros: ['Reduces clutter when many queues register.'],
      summary: 'Show top N queues by total jobs with “show more”.',
      verdict: 'rejected',
    },
  ];

/** Recommended for spike + implementation tasks (ca9f31ac, 1b69a214). */
export const QUEUE_STATS_CHART_FINALIST_IDS = [
  'operational-default-with-completed-toggle',
  'dual-chart-operations-and-completed',
] as const;

export type QueueStatsChartFinalistId =
  (typeof QUEUE_STATS_CHART_FINALIST_IDS)[number];

/**
 * @description Primary recommendation: operational default + optional completed toggle.
 * Spike should implement this first; fall back to dual-chart if toggle UX feels too hidden.
 */
export const QUEUE_STATS_CHART_RECOMMENDED_FINALIST: QueueStatsChartFinalistId =
  'operational-default-with-completed-toggle';

/**
 * @description Returns chart series keys for the operational vs all-series views.
 */
export function seriesKeysForQueueStatsView(
  includeCompleted: boolean,
): ReadonlyArray<(typeof QUEUE_STATS_CHART_SERIES)[number]> {
  return includeCompleted
    ? QUEUE_STATS_CHART_SERIES
    : QUEUE_STATS_CHART_OPERATIONAL_SERIES;
}

/** Minimum height (px) for the vertical grouped bar chart. */
export const QUEUE_STATS_CHART_MIN_HEIGHT = 300;

/** Approximate height (px) per queue row including grouped bar padding. */
export const QUEUE_STATS_CHART_ROW_HEIGHT = 52;

/**
 * @description Scales chart height with queue count so row labels and bars stay readable.
 */
export function queueStatsChartHeight(queueCount: number): number {
  if (queueCount <= 0) {
    return QUEUE_STATS_CHART_MIN_HEIGHT;
  }
  return Math.max(
    QUEUE_STATS_CHART_MIN_HEIGHT,
    queueCount * QUEUE_STATS_CHART_ROW_HEIGHT + 48,
  );
}

/**
 * @description Compact numeric ticks for job-count X-axis (e.g. 48200 → "48.2K").
 */
export function formatQueueStatsChartTick(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}

/**
 * @description ChartConfig entries for the active view (legend + bar colors).
 */
export function chartConfigForQueueStatsView(
  includeCompleted: boolean,
): ChartConfig {
  const keys = seriesKeysForQueueStatsView(includeCompleted);
  const config: ChartConfig = {};
  for (const key of keys) {
    const entry = QUEUE_STATS_CHART_CONFIG[key];
    if (entry) {
      config[key] = entry;
    }
  }
  return config;
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
