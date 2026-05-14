import { ChartConfig } from '@openthrottle/react-router-shadcn';

export const GLOBAL_METRICS_STORAGE_KEY = `openthrottle-developer:metricsPollInterval`;

export const GLOBAL_METRICS_POLL_INTERVAL_DEFAULT = 60_000;
export const GLOBAL_METRICS_POLL_INTERVAL_PRESETS: readonly {
  readonly label: string;
  readonly valueMs: number;
}[] = [
  { label: '60s', valueMs: 60_000 },
  { label: '30s', valueMs: 30_000 },
  { label: '15s', valueMs: 15_000 },
  { label: '5s', valueMs: 5_000 },
  { label: 'Off', valueMs: 0 },
];

export const GLOBAL_METRICS_VALID_INTERVALS = new Set(
  GLOBAL_METRICS_POLL_INTERVAL_PRESETS.map((p) => p.valueMs),
);

/** Muted, low-saturation colors for chart lines (background-style). */
export const GLOBAL_METRICS_CHART_CONFIG: ChartConfig = {
  cpuUserMs: {
    color: 'hsl(30 18% 55%)',
    label: 'CPU user (ms)',
  },
  heapUsedMb: {
    color: 'hsl(160 18% 48%)',
    label: 'Heap used (MB)',
  },
  rssMb: {
    color: 'hsl(220 18% 52%)',
    label: 'RSS (MB)',
  },
};

/** Series drawn in the chart and listed in the legend (order matters). */
export const GLOBAL_METRICS_CHART_LINE_KEYS = [
  'rssMb',
  'heapUsedMb',
  'cpuUserMs',
] as const;

export type GlobalMetricsChartLineKey =
  (typeof GLOBAL_METRICS_CHART_LINE_KEYS)[number];

/**
 * @description Short captions for chart legend rows (visible without opening the help tooltip).
 */
export const GLOBAL_METRICS_LINE_DEFINITIONS: Readonly<
  Record<GlobalMetricsChartLineKey, string>
> = {
  cpuUserMs:
    'Cumulative user-mode CPU time for this Node process (chart series; system CPU stays on the stat card only).',
  heapUsedMb: 'V8 heap bytes currently used for JavaScript objects.',
  rssMb:
    'Resident set size — total process memory the OS attributes to the API process.',
};

export interface GlobalMetricsStatCardDoc {
  readonly body: string;
  readonly title: string;
}

/**
 * @description Copy shared by the metrics tooltip, Settings debug panel, and in-app hints.
 */
export const GLOBAL_METRICS_STAT_CARD_DOCS: readonly GlobalMetricsStatCardDoc[] =
  [
    {
      body: 'Large number: RSS (resident set size), total process memory the OS tracks for the Node process. Sub-value: “external” bytes outside the V8 heap (buffers, native addons). Useful for overall footprint; low hundreds of MB is common in local dev.',
      title: 'RSS / External (MB)',
    },
    {
      body: 'Large number: V8 heap currently used. Sub-value: heap limit / total allocated for JS objects. When used persistently nears total, expect GC pressure or risk of allocation failures.',
      title: 'Heap (MB)',
    },
    {
      body: 'Cumulative CPU milliseconds since the server process started (not per request). User time is JS/work in process context; system time is kernel work on behalf of the process. Both increase over time; abrupt spikes while idle may mean heavy background work. The trend chart plots user ms only so the Y axis stays comparable to memory lines.',
      title: 'CPU user / system (ms)',
    },
  ];
