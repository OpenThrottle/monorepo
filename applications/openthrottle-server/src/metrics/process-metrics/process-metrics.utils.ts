/**
 * @description Formats task-run metrics for human-readable output (e.g. plan_output_stream chunk).
 */

import type {
  EnhancedTaskRunMetrics,
  TaskRunMetrics,
} from './process-metrics.types.ts';

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
  const isInfinite = metrics.wallClockToCpuRatio === Infinity;
  const ratio = isInfinite ? '∞' : metrics.wallClockToCpuRatio.toFixed(1);
  return `ratio ${ratio}x (${metrics.interpretation})`;
}

/**
 * @description Formats a compact system load summary.
 */
function formatSystemCpuCompact(
  metrics: NonNullable<EnhancedTaskRunMetrics['systemCpuMetrics']>,
): string {
  const { perCoreLoad1m } = metrics.atEnd.loadAverage;
  const throttled = metrics.containerCpuWindow?.throttledPeriodRatio ?? null;
  const load = `load ${perCoreLoad1m.toFixed(1)}/core (${metrics.pressureLevel})`;
  if (throttled === null) {
    return load;
  }
  return `${load}, container throttled ${Math.round(throttled * 100)}%`;
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

  const systemPart = systemCpuMetrics
    ? formatSystemCpuCompact(systemCpuMetrics)
    : null;

  // System CPU alone must not replace the process RSS/heap/CPU line: every plan run records it.
  if (parts.length === 0) {
    const processSummary = formatTaskRunMetricsSummary(metrics);
    return systemPart === null
      ? processSummary
      : `${processSummary}, ${systemPart}`;
  }

  if (systemPart !== null) {
    parts.push(systemPart);
  }

  return `Metrics: ${parts.join(', ')}`;
}
