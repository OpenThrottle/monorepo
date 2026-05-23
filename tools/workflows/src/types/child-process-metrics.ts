/**
 * @description Types for child process CPU/memory metrics.
 * Used by runChildJob to capture resource usage of spawned Ralph/cursor-agent processes.
 * Aligns with plan: "Add child process and system-level CPU profiling for Ralph workflows".
 */

/** Single sample of child process CPU and memory from pidusage. */
export interface ChildProcessSample {
  /** CPU percentage (0–100+) at this sample. */
  readonly cpu: number;
  /** Elapsed wall-clock time (ms) since job start when sample was taken. */
  readonly elapsedMs: number;
  /** Resident set size in MB at this sample. */
  readonly rssMb: number;
  /** Timestamp (Date.now()) when sample was taken. */
  readonly timestamp: number;
}

/** Aggregated metrics for a child process over its lifetime. */
export interface ChildProcessMetrics {
  /** Average CPU percentage across all samples. */
  readonly avgCpuPercent: number;
  /** Average RSS in MB across all samples. */
  readonly avgRssMb: number;
  /** Peak CPU percentage observed across all samples. */
  readonly peakCpuPercent: number;
  /** Peak RSS in MB observed across all samples. */
  readonly peakRssMb: number;
  /** Process ID of the child that was monitored. */
  readonly pid: number;
  /** Polling interval in ms (e.g. 5000). */
  readonly pollIntervalMs: number;
  /** Number of samples taken. */
  readonly sampleCount: number;
  /** All samples (for debugging or detailed analysis). Optional: may be omitted for smaller payloads. */
  readonly samples?: readonly ChildProcessSample[];
}

/** Options for child process metrics polling. */
export interface ChildProcessMetricsOptions {
  /** Whether to keep all samples (true) or just aggregates (false). Defaults to false. */
  readonly keepSamples?: boolean;
  /** Polling interval in milliseconds. Defaults to 5000 (5s). */
  readonly pollIntervalMs?: number;
}

/** Default polling interval for child process metrics (5 seconds). */
export const DEFAULT_POLL_INTERVAL_MS = 5000;
