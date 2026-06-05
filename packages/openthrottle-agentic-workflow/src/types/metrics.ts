/**
 * Linux Pressure Stall Information (PSI) for CPU.
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
 * System load average from os.loadavg().
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
 * System-level CPU metrics snapshot at a point in time.
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
 * Complete system CPU metrics for a job, including start/end snapshots and deltas.
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
