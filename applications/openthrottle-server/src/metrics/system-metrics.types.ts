/**
 * @description Types for the /metrics/system endpoint.
 * Provides system-level metrics for live profiling: load average, CPU pressure (Linux PSI),
 * and count of active Ralph child processes.
 */

import * as os from 'os';

/**
 * @description System load average from os.loadavg().
 * Represents average number of processes in the run queue over 1, 5, and 15 minutes.
 */
export interface LoadAverageSnapshot {
  readonly load1m: number;
  readonly load5m: number;
  readonly load15m: number;
  readonly cpuCount: number;
  readonly perCoreLoad1m: number;
}

/**
 * @description Linux Pressure Stall Information (PSI) for CPU.
 * From /proc/pressure/cpu: shows percentage of time tasks were stalled on CPU.
 * Null values indicate PSI is unavailable (non-Linux or cgroup v1).
 */
export interface PsiSnapshot {
  readonly some10s: number | null;
  readonly some60s: number | null;
  readonly some300s: number | null;
  readonly full10s: number | null;
  readonly full60s: number | null;
  readonly full300s: number | null;
}

/**
 * @description Active worktree/child process summary.
 */
export interface ActiveProcessesSummary {
  readonly activeWorktreeCount: number;
  readonly totalWorktreeCount: number;
  readonly lockedWorktrees: readonly string[];
}

/**
 * @description Interpretation of system CPU pressure.
 */
export type PressureLevel = 'low' | 'moderate' | 'high' | 'unknown';

/**
 * @description Complete system metrics snapshot for the /metrics/system endpoint.
 */
export interface SystemMetricsSnapshot {
  readonly timestamp: number;
  readonly platform: NodeJS.Platform;
  readonly loadAverage: LoadAverageSnapshot;
  readonly psi: PsiSnapshot;
  readonly psiAvailable: boolean;
  readonly pressureLevel: PressureLevel;
  readonly activeProcesses: ActiveProcessesSummary;
}

/**
 * @description Captures a LoadAverageSnapshot from os.loadavg().
 */
export function captureLoadAverage(): LoadAverageSnapshot {
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
 * @description Creates an empty PSI snapshot (all nulls).
 */
export function createEmptyPsiSnapshot(): PsiSnapshot {
  return {
    full10s: null,
    full300s: null,
    full60s: null,
    some10s: null,
    some300s: null,
    some60s: null,
  };
}

/**
 * @description Determines pressure level from load average and PSI metrics.
 */
export function determinePressureLevel(
  loadAverage: LoadAverageSnapshot,
  psi: PsiSnapshot,
): PressureLevel {
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
