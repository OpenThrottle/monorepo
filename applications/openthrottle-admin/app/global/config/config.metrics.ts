export const METRICS_MAX_SAMPLES = 25;
export const METRICS_STORAGE_KEY = 'openthrottle-developer:metricsPollInterval';

export const METRICS_POLLING_INTERVAL_DEFAULT = 60_000;
export const METRICS_POLLING_INTERVALS: readonly {
  readonly label: string;
  readonly valueMs: number;
}[] = [
  { label: '60s', valueMs: 60_000 },
  { label: '30s', valueMs: 30_000 },
  { label: '15s', valueMs: 15_000 },
  { label: '5s', valueMs: 5_000 },
  { label: 'Off', valueMs: 0 },
];

export const METRICS_VALID_INTERVALS = new Set(
  METRICS_POLLING_INTERVALS.map((p) => p.valueMs),
);
