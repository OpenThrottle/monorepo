/**
 * @description Types for wall-clock duration vs CPU time metrics.
 * Used to determine if jobs are CPU-bound, I/O-bound, or wait-bound.
 */

/**
 * @description Wall-clock and CPU time metrics for a job.
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
   * - ~1: CPU-bound (little idle time)
   * - 2-5: I/O or mixed workload
   * - 5: Significant wait time (network, external processes)
   * If cpuTimeMs is 0, ratio is Infinity (pure idle/wait).
   */
  readonly wallClockToCpuRatio: number;
}

/**
 * @description Creates {@link WallClockMetrics} from start/end timestamps and CPU usage deltas.
 */
export function createWallClockMetrics(params: {
  readonly cpuSystemDeltaMs: number;
  readonly cpuUserDeltaMs: number;
  readonly endTimestamp: number;
  readonly startTimestamp: number;
}): WallClockMetrics {
  const { startTimestamp, endTimestamp, cpuUserDeltaMs, cpuSystemDeltaMs } =
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
 * @description Formats {@link WallClockMetrics} as a one-line summary for logs.
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
