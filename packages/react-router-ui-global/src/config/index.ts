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
