/**
 * @description Types for system-level CPU pressure metrics.
 * Captures Linux PSI metrics, macOS skip behavior, and os.loadavg() at job start/end.
 * Aligns with plan: "Add child process and system-level CPU profiling for Ralph workflows".
 */

import * as os from 'os';
import {
  LoadAverageMetrics,
  PsiCpuMetrics,
  SystemCpuMetrics,
} from '../types/metrics.ts';

/**
 * @description Rounds raw `os.loadavg()` values into a {@link LoadAverageMetrics}
 * snapshot. Per-core load is derived from the *raw* 1m load (then rounded), not
 * from the already-rounded `load1m` field.
 */
export function toLoadAverageMetrics(
  loadavg: readonly [number, number, number],
  cpuCount: number,
): LoadAverageMetrics {
  const [load1m, load5m, load15m] = loadavg;
  const perCoreLoad1m =
    cpuCount > 0 ? Math.round((load1m / cpuCount) * 100) / 100 : load1m;

  return {
    cpuCount,
    load15m: Math.round(load15m * 100) / 100,
    load1m: Math.round(load1m * 100) / 100,
    load5m: Math.round(load5m * 100) / 100,
    perCoreLoad1m,
  };
}

/**
 * @description Creates a LoadAverageMetrics snapshot from os.loadavg().
 */
export function captureLoadAverage(): LoadAverageMetrics {
  const [load1m = 0, load5m = 0, load15m = 0] = os.loadavg();
  return toLoadAverageMetrics([load1m, load5m, load15m], os.cpus().length);
}

/**
 * @description Creates an empty PSI metrics object (all nulls).
 * Used on platforms that don't support PSI.
 */
export function createEmptyPsiMetrics(): PsiCpuMetrics {
  return {
    full10s: null,
    full300s: null,
    full60s: null,
    fullTotalUs: null,
    some10s: null,
    some300s: null,
    some60s: null,
    someTotalUs: null,
  };
}

/**
 * @description Determines pressure level from load average and PSI metrics.
 */
export function determinePressureLevel(
  loadAverage: LoadAverageMetrics,
  psi: PsiCpuMetrics,
): SystemCpuMetrics['pressureLevel'] {
  const { perCoreLoad1m } = loadAverage;
  const psiSome = psi.some10s;

  // Guard against NaN/Infinity: the load thresholds below partition the finite
  // number line, so 'unknown' is only reachable for a non-finite perCoreLoad1m.
  if (!Number.isFinite(perCoreLoad1m)) {
    return 'unknown';
  }

  if (perCoreLoad1m > 1.5 || (psiSome !== null && psiSome > 20)) {
    return 'high';
  }

  // The high branch already returned for psiSome > 20, so no upper bound is
  // needed here; perCoreLoad1m in [0.7, 1.5] or psiSome in [5, 20] is moderate.
  if (perCoreLoad1m >= 0.7 || (psiSome !== null && psiSome >= 5)) {
    return 'moderate';
  }

  return 'low';
}

/**
 * @description Formats system CPU metrics as a one-line summary for logs.
 */
export function formatSystemCpuMetrics(metrics: SystemCpuMetrics): string {
  // Intentionally only reads `atEnd`: the stall delta is precomputed in
  // `psiSomeDeltaUs`, so this formatter never needs the `atStart` snapshot.
  // `atStart` is retained on SystemCpuMetrics for downstream consumers — do not
  // remove it as "unused".
  const { atEnd, psiAvailable, psiSomeDeltaUs, pressureLevel, platform } =
    metrics;
  const { load1m, cpuCount, perCoreLoad1m } = atEnd.loadAverage;

  let summary = `System CPU: load ${load1m} (${perCoreLoad1m}/core on ${cpuCount} cores), pressure: ${pressureLevel}`;

  if (psiAvailable && atEnd.psi.some10s !== null) {
    summary += `, PSI some10s: ${atEnd.psi.some10s}%`;
  }

  if (psiSomeDeltaUs !== null && psiSomeDeltaUs > 0) {
    const deltaMsec = (psiSomeDeltaUs / 1000).toFixed(1);
    summary += `, stall delta: ${deltaMsec}ms`;
  }

  if (platform !== 'linux') {
    summary += ` (PSI unavailable on ${platform})`;
  }

  return summary;
}
