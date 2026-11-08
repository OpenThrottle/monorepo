/**
 * @description Types for the /metrics/system endpoint.
 * Provides system-level metrics for live profiling: load average, CPU pressure (Linux PSI),
 * and count of active Ralph child processes.
 */

/**
 * @description System load average from os.loadavg().
 * Represents average number of processes in the run queue over 1, 5, and 15 minutes.
 */
export interface LoadAverageSnapshot {
  readonly cpuCount: number;
  readonly load15m: number;
  readonly load1m: number;
  readonly load5m: number;
  readonly perCoreLoad1m: number;
}

/**
 * @description Linux Pressure Stall Information (PSI) for CPU.
 * From /proc/pressure/cpu: shows percentage of time tasks were stalled on CPU.
 * Null values indicate PSI is unavailable (non-Linux or cgroup v1).
 */
export interface PsiSnapshot {
  readonly full10s: number | null;
  readonly full300s: number | null;
  readonly full60s: number | null;
  readonly some10s: number | null;
  readonly some300s: number | null;
  readonly some60s: number | null;
}

/**
 * @description Active worktree/child process summary.
 */
export interface ActiveProcessesSummary {
  readonly activeWorktreeCount: number;
  readonly lockedWorktrees: readonly string[];
  readonly totalWorktreeCount: number;
}

/**
 * @description Interpretation of system CPU pressure.
 */
export type PressureLevel = 'low' | 'moderate' | 'high' | 'unknown';

/**
 * @description Complete system metrics snapshot for the /metrics/system endpoint.
 */
export interface SystemMetricsSnapshot {
  readonly activeProcesses: ActiveProcessesSummary;
  readonly loadAverage: LoadAverageSnapshot;
  readonly platform: NodeJS.Platform;
  readonly pressureLevel: PressureLevel;
  readonly psi: PsiSnapshot;
  readonly psiAvailable: boolean;
  readonly timestamp: number;
}
