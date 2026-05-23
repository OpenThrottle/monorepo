/**
 * @description Types for system-level CPU pressure metrics.
 * Captures Linux PSI metrics, macOS skip behavior, and os.loadavg() at job start/end.
 * Aligns with plan: "Add child process and system-level CPU profiling for Ralph workflows".
 */

import * as os from 'os';

/**
 * @description Linux Pressure Stall Information (PSI) for CPU.
 * From /proc/pressure/cpu: shows percentage of time tasks were stalled on CPU.
 * "some" = at least one task stalled; "full" = all runnable tasks stalled.
 */
export interface PsiCpuMetrics {
  /**
   * Percentage of time all runnable tasks were stalled on CPU.
   * Usually 0 for CPU (no "full" line in /proc/pressure/cpu on most kernels).
   */
  readonly full10s: number | null;
  readonly full300s: number | null;
  readonly full60s: number | null;
  readonly fullTotalUs: number | null;
  /**
   * Percentage of time at least one task was stalled on CPU (avg over 10s, 60s, 300s).
   * null if PSI not available (non-Linux or cgroup v1).
   */
  readonly some10s: number | null;
  readonly some300s: number | null;
  readonly some60s: number | null;
  /**
   * Total stall time in microseconds (cumulative since boot).
   * Useful for delta calculations between job start/end.
   */
  readonly someTotalUs: number | null;
}

/**
 * @description System load average from os.loadavg().
 * Represents average number of processes in the run queue over 1, 5, and 15 minutes.
 */
export interface LoadAverageMetrics {
  /** Number of logical CPUs (for context: load / cpus = per-core load). */
  readonly cpuCount: number;
  readonly load15m: number;
  readonly load1m: number;
  readonly load5m: number;
  /** Per-core load (load1m / cpuCount). > 1 means oversubscribed. */
  readonly perCoreLoad1m: number;
}

/**
 * @description System-level CPU metrics snapshot at a point in time.
 * Captured at job start and end to measure system pressure during execution.
 */
export interface SystemCpuSnapshot {
  /** Load average at snapshot time. */
  readonly loadAverage: LoadAverageMetrics;
  /** PSI metrics at snapshot time (Linux only; null fields on macOS/Windows). */
  readonly psi: PsiCpuMetrics;
  /** Timestamp when snapshot was taken (Date.now()). */
  readonly timestamp: number;
}

/**
 * @description Complete system CPU metrics for a job, including start/end snapshots and deltas.
 */
export interface SystemCpuMetrics {
  /** Snapshot at job end. */
  readonly atEnd: SystemCpuSnapshot;
  /** Snapshot at job start. */
  readonly atStart: SystemCpuSnapshot;
  /** Platform: 'linux', 'darwin', 'win32', etc. */
  readonly platform: NodeJS.Platform;
  /**
   * Interpretation of system CPU pressure:
   * - 'low': per-core load < 0.7 and PSI some < 5%
   * - 'moderate': per-core load 0.7-1.5 or PSI some 5-20%
   * - 'high': per-core load > 1.5 or PSI some > 20%
   * - 'unknown': unable to determine (e.g., very short job)
   */
  readonly pressureLevel: 'low' | 'moderate' | 'high' | 'unknown';
  /** Whether PSI metrics are available (Linux with cgroup v2). */
  readonly psiAvailable: boolean;
  readonly psiFullDeltaUs: number | null;
  /**
   * Delta in PSI total stall time (microseconds) during the job.
   * Positive value indicates tasks were stalled on CPU during execution.
   * null if PSI not available.
   */
  readonly psiSomeDeltaUs: number | null;
}

/**
 * @description Creates a LoadAverageMetrics snapshot from os.loadavg().
 */
export function captureLoadAverage(): LoadAverageMetrics {
  const [load1m, load5m, load15m] = os.loadavg();
  const cpuCount = os.cpus().length;
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

  if (perCoreLoad1m > 1.5 || (psiSome !== null && psiSome > 20)) {
    return 'high';
  }

  if (
    perCoreLoad1m >= 0.7 ||
    (psiSome !== null && psiSome >= 5 && psiSome <= 20)
  ) {
    return 'moderate';
  }

  if (perCoreLoad1m < 0.7 && (psiSome === null || psiSome < 5)) {
    return 'low';
  }

  return 'unknown';
}

/**
 * @description Formats system CPU metrics as a one-line summary for logs.
 */
export function formatSystemCpuMetrics(metrics: SystemCpuMetrics): string {
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
