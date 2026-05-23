/**
 * @description Formats task-run metrics for human-readable output (e.g. plan_output_stream chunk).
 * See tools/workflows/docs/server-and-task-metrics.md.
 */

import type {
  EnhancedTaskRunMetrics,
  TaskRunMetrics,
} from './process-metrics.types';

/**
 * @description Returns a one-line summary of task-run metrics (start → end) for logs and plan output.
 */
export function formatTaskRunMetricsSummary(metrics: TaskRunMetrics): string {
  const { atStart, atEnd } = metrics;

  const rss = `${atStart.rssMb.toFixed(1)}→${atEnd.rssMb.toFixed(1)}`;
  const heap = `${atStart.heapUsedMb.toFixed(1)}→${atEnd.heapUsedMb.toFixed(1)}`;
  const cpuUser = `${atStart.cpuUserMs}→${atEnd.cpuUserMs}`;
  const cpuSystem = `${atStart.cpuSystemMs}→${atEnd.cpuSystemMs}`;

  return `Task run metrics: RSS ${rss} MB, heap ${heap} MB, CPU user ${cpuUser} ms, system ${cpuSystem} ms`;
}

/**
 * @description Formats a compact child process CPU summary.
 */
function formatChildProcessCompact(
  metrics: NonNullable<EnhancedTaskRunMetrics['childProcessMetrics']>,
): string {
  return `child peak ${metrics.peakCpuPercent.toFixed(0)}%`;
}

/**
 * @description Formats a compact wall-clock ratio summary.
 */
function formatWallClockCompact(
  metrics: NonNullable<EnhancedTaskRunMetrics['wallClockMetrics']>,
): string {
  const ratio =
    metrics.wallClockToCpuRatio === Infinity
      ? '∞'
      : metrics.wallClockToCpuRatio.toFixed(1);
  return `ratio ${ratio}x (${metrics.interpretation})`;
}

/**
 * @description Formats a compact system load summary.
 */
function formatSystemCpuCompact(
  metrics: NonNullable<EnhancedTaskRunMetrics['systemCpuMetrics']>,
): string {
  const { perCoreLoad1m } = metrics.atEnd.loadAverage;
  return `load ${perCoreLoad1m.toFixed(1)}/core (${metrics.pressureLevel})`;
}

/**
 * @description Returns a one-line summary of enhanced task-run metrics for logs and plan output.
 * Includes child process peak CPU%, wall-clock ratio and interpretation, and system load.
 *
 * @example
 * // Full example with all metrics:
 * // "Metrics: 45.2s wall, child peak 85%, ratio 2.5x (mixed), load 1.2/core (moderate)"
 */
export function formatEnhancedTaskRunMetricsSummary(
  metrics: EnhancedTaskRunMetrics,
): string {
  const { childProcessMetrics, wallClockMetrics, systemCpuMetrics } = metrics;

  const parts: string[] = [];

  if (wallClockMetrics) {
    const durationSec = (wallClockMetrics.wallClockMs / 1000).toFixed(1);
    parts.push(`${durationSec}s wall`);
  }

  if (childProcessMetrics && childProcessMetrics.sampleCount > 0) {
    parts.push(formatChildProcessCompact(childProcessMetrics));
  }

  if (wallClockMetrics) {
    parts.push(formatWallClockCompact(wallClockMetrics));
  }

  if (systemCpuMetrics) {
    parts.push(formatSystemCpuCompact(systemCpuMetrics));
  }

  if (parts.length === 0) {
    return formatTaskRunMetricsSummary(metrics);
  }

  return `Metrics: ${parts.join(', ')}`;
}
