/**
 * Shared, deterministic fixtures for the chart stories. Fixed values (never
 * `Math.random()` or `new Date()`) so every render — and any future snapshot —
 * is identical.
 */
/**
 * A `type`, not an `interface`: the chart components constrain their row type
 * to `Record<string, unknown>`, and interfaces get no implicit index signature
 * — so an interface here fails to satisfy that constraint.
 */
export type BuildPoint = {
  readonly duration: number;
  readonly month: string;
};

export const BUILD_DURATIONS: readonly BuildPoint[] = [
  { duration: 134, month: 'Mar' },
  { duration: 122, month: 'Apr' },
  { duration: 148, month: 'May' },
  { duration: 119, month: 'Jun' },
  { duration: 96, month: 'Jul' },
  { duration: 88, month: 'Aug' },
];

export type StatusSlice = {
  readonly count: number;
  readonly status: string;
};

export const BUILD_STATUS: readonly StatusSlice[] = [
  { count: 412, status: 'passed' },
  { count: 38, status: 'failed' },
  { count: 21, status: 'cancelled' },
  { count: 9, status: 'timed out' },
];
