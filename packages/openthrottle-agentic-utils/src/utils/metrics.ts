/**
 * Types for wall-clock duration vs CPU time metrics.
 * Used to determine if jobs are CPU-bound, I/O-bound, or wait-bound.
 */

import pidusage from 'pidusage';

const BYTES_PER_MB = 1024 * 1024;

/**
 * Default polling interval for child process metrics (5 seconds).
 */
export const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Wall-clock and CPU time metrics for a job.
 *
 * - If wallClockMs >> cpuTimeMs (ratio > 2), the job is I/O or wait-bound.
 * - If wallClockMs ≈ cpuTimeMs (ratio ≈ 1), the job is CPU-bound.
 * - Ratio > 5 suggests significant idle time (network, disk, or external waits).
 */
export interface WallClockMetrics {
  /** CPU system time delta in milliseconds (from process.cpuUsage). */
  readonly cpuSystemMs: number;
  /** Total CPU time (user + system) in milliseconds. */
  readonly cpuTimeMs: number;
  /** CPU user time delta in milliseconds (from process.cpuUsage). */
  readonly cpuUserMs: number;
  /** End timestamp (Date.now()) when job completed. */
  readonly endTimestamp: number;
  /**
   * Interpretation hint based on ratio:
   *
   * - 'cpu_bound': ratio <= 1.5
   * - 'mixed': ratio > 1.5 and <= 5
   * - 'io_bound': ratio > 5
   * - 'idle': cpuTimeMs is 0 or negligible
   */
  readonly interpretation: 'cpu_bound' | 'mixed' | 'io_bound' | 'idle';
  /** Start timestamp (Date.now()) when job began. */
  readonly startTimestamp: number;
  /** Wall-clock duration in milliseconds (end - start timestamp). */
  readonly wallClockMs: number;
  /**
   * Ratio of wall-clock to CPU time: wallClockMs / cpuTimeMs.
   *
   * - ~1: CPU-bound (little idle time)
   * - 2-5: I/O or mixed workload
   * - 5: Significant wait time (network, external processes)
   *
   * If cpuTimeMs is 0, ratio is Infinity (pure idle/wait).
   */
  readonly wallClockToCpuRatio: number;
}

/**
 * Creates {@link WallClockMetrics} from start/end timestamps and CPU usage deltas.
 */
export function createWallClockMetrics(params: {
  readonly cpuSystemDeltaMs: number;
  readonly cpuUserDeltaMs: number;
  readonly endTimestamp: number;
  readonly startTimestamp: number;
}): WallClockMetrics {
  const { cpuUserDeltaMs, cpuSystemDeltaMs, endTimestamp, startTimestamp } =
    params;

  const wallClockMs = endTimestamp - startTimestamp;
  const cpuTimeMs = cpuUserDeltaMs + cpuSystemDeltaMs;

  let wallClockToCpuRatio: number;
  let interpretation: WallClockMetrics['interpretation'];

  if (cpuTimeMs <= 0) {
    wallClockToCpuRatio = wallClockMs > 0 ? Infinity : 1;
    interpretation = 'idle';
  } else {
    wallClockToCpuRatio = Math.round((wallClockMs / cpuTimeMs) * 100) / 100;

    if (wallClockToCpuRatio <= 1.5) {
      interpretation = 'cpu_bound';
    } else if (wallClockToCpuRatio <= 5) {
      interpretation = 'mixed';
    } else {
      interpretation = 'io_bound';
    }
  }

  return {
    cpuSystemMs: cpuSystemDeltaMs,
    cpuTimeMs,
    cpuUserMs: cpuUserDeltaMs,
    endTimestamp,
    interpretation,
    startTimestamp,
    wallClockMs,
    wallClockToCpuRatio,
  };
}

/**
 * Formats {@link WallClockMetrics} as a one-line summary for logs.
 */
export function formatWallClockMetrics(metrics: WallClockMetrics): string {
  const durationSec = (metrics.wallClockMs / 1000).toFixed(1);
  const cpuSec = (metrics.cpuTimeMs / 1000).toFixed(1);
  const ratio =
    metrics.wallClockToCpuRatio === Infinity
      ? '∞'
      : metrics.wallClockToCpuRatio.toFixed(2);

  return `Wall clock: ${durationSec}s, CPU: ${cpuSec}s (user: ${(metrics.cpuUserMs / 1000).toFixed(1)}s, sys: ${(metrics.cpuSystemMs / 1000).toFixed(1)}s), ratio: ${ratio}x (${metrics.interpretation})`;
}

/**
 * Single sample of child process CPU and memory from pidusage.
 */
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

/**
 * Aggregated metrics for a child process over its lifetime.
 */
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

/**
 * Options for child process metrics polling.
 */
export interface ChildProcessMetricsOptions {
  /** Whether to keep all samples (true) or just aggregates (false). Defaults to false. */
  readonly keepSamples?: boolean;
  /** Polling interval in milliseconds. Defaults to 5000 (5s). */
  readonly pollIntervalMs?: number;
}

/**
 * Creates a collector that polls a child process at intervals.
 * Call start() with a PID after spawn, then stop() when the process exits.
 * Returns aggregated {@link ChildProcessMetrics}.
 */
export interface ChildProcessMetricsCollector {
  /** Start polling the given PID. Call once after spawn. */
  start(pid: number): void;
  /** Stop polling and return aggregated metrics. Safe to call multiple times. */
  stop(): ChildProcessMetrics | null;
  /** Whether the collector has been stopped. */
  readonly stopped: boolean;
}

interface ChildProcessMetricsCollectorState {
  intervalId: ReturnType<typeof setInterval> | null;
  readonly keepSamples: boolean;
  metricsReturned: boolean;
  pid: number;
  readonly pollIntervalMs: number;
  samples: ChildProcessSample[];
  startTime: number;
  stopped: boolean;
}

/**
 * Creates a new child process metrics collector.
 * The collector polls the child process at the given interval and aggregates CPU/RSS metrics.
 */
export function createChildProcessMetricsCollector(
  options: ChildProcessMetricsOptions = {},
): ChildProcessMetricsCollector {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const keepSamples = options.keepSamples ?? false;

  const state: ChildProcessMetricsCollectorState = {
    intervalId: null,
    keepSamples,
    metricsReturned: false,
    pid: 0,
    pollIntervalMs,
    samples: [],
    startTime: 0,
    stopped: false,
  };

  const takeSample = async (): Promise<void> => {
    if (state.stopped || state.pid === 0) return;

    try {
      const stats = await pidusage(state.pid);
      const sample: ChildProcessSample = {
        cpu: stats.cpu,
        elapsedMs: Date.now() - state.startTime,
        rssMb: stats.memory / BYTES_PER_MB,
        timestamp: Date.now(),
      };
      state.samples.push(sample);
    } catch {
      // Process may have exited; ignore and let stop() finalize
    }
  };

  const start = (pid: number): void => {
    if (state.stopped) return;

    state.pid = pid;
    state.startTime = Date.now();

    takeSample();

    state.intervalId = setInterval(() => {
      takeSample();
    }, pollIntervalMs);
  };

  const stop = (): ChildProcessMetrics | null => {
    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.stopped = true;

    if (
      state.metricsReturned ||
      state.pid === 0 ||
      state.samples.length === 0
    ) {
      return null;
    }

    const { samples, pid } = state;
    const cpuValues = samples.map((s) => s.cpu);
    const rssValues = samples.map((s) => s.rssMb);

    const peakCpuPercent = Math.max(...cpuValues);
    const avgCpuPercent =
      cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length;
    const peakRssMb = Math.max(...rssValues);
    const avgRssMb =
      rssValues.reduce((sum, v) => sum + v, 0) / rssValues.length;

    const result: ChildProcessMetrics = {
      avgCpuPercent: Math.round(avgCpuPercent * 100) / 100,
      avgRssMb: Math.round(avgRssMb * 100) / 100,
      peakCpuPercent: Math.round(peakCpuPercent * 100) / 100,
      peakRssMb: Math.round(peakRssMb * 100) / 100,
      pid,
      pollIntervalMs: state.pollIntervalMs,
      sampleCount: samples.length,
      samples: keepSamples ? samples : undefined,
    };

    state.metricsReturned = true;

    return result;
  };

  return {
    start,
    stop,
    get stopped(): boolean {
      return state.stopped;
    },
  };
}
