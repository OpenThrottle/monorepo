/**
 * @description Formatting utilities for combined process metrics summaries.
 * Creates one-line summaries suitable for appending to plan_output_stream.
 * Aligns with plan: "Add child process and system-level CPU profiling for Ralph workflows".
 */

import { formatSystemCpuMetrics } from '@openthrottle/openthrottle-agentic-workflow';
import { formatWallClockMetrics } from '../types/wall-clock-metrics';
import type { ChildProcessMetrics } from '../types/child-process-metrics';
import type { SystemCpuMetrics } from '@openthrottle/openthrottle-agentic-workflow';
import type { WallClockMetrics } from '../types/wall-clock-metrics';

/**
 * @description Combined metrics for a task run, including child process,
 * wall-clock, and system CPU metrics.
 */
export interface TaskRunMetrics {
  readonly childProcessMetrics?: ChildProcessMetrics;
  readonly systemCpuMetrics?: SystemCpuMetrics;
  readonly wallClockMetrics?: WallClockMetrics;
}

/**
 * @description Formats child process metrics as a one-line summary.
 * Example: "Child: peak 85% CPU, avg 42% CPU, peak 512MB RSS (15 samples)"
 */
export function formatChildProcessMetrics(
  metrics: ChildProcessMetrics,
): string {
  const { peakCpuPercent, avgCpuPercent, peakRssMb, avgRssMb, sampleCount } =
    metrics;

  const peakCpu = peakCpuPercent.toFixed(1);
  const avgCpu = avgCpuPercent.toFixed(1);
  const peakRss = peakRssMb.toFixed(0);
  const avgRss = avgRssMb.toFixed(0);

  return `Child: peak ${peakCpu}% CPU, avg ${avgCpu}% CPU, peak ${peakRss}MB RSS, avg ${avgRss}MB RSS (${sampleCount} samples)`;
}

/**
 * @description Formats a compact child process CPU summary for inclusion in combined summaries.
 * Example: "child peak 85%"
 */
function formatChildProcessCompact(metrics: ChildProcessMetrics): string {
  return `child peak ${metrics.peakCpuPercent.toFixed(0)}%`;
}

/**
 * @description Formats a compact wall-clock ratio summary.
 * Example: "ratio 2.5x (mixed)"
 */
function formatWallClockCompact(metrics: WallClockMetrics): string {
  const ratio =
    metrics.wallClockToCpuRatio === Infinity
      ? '∞'
      : metrics.wallClockToCpuRatio.toFixed(1);

  return `ratio ${ratio}x (${metrics.interpretation})`;
}

/**
 * @description Formats a compact system load summary.
 * Example: "load 2.1/core (high)"
 */
function formatSystemCpuCompact(metrics: SystemCpuMetrics): string {
  const { perCoreLoad1m } = metrics.atEnd.loadAverage;

  return `load ${perCoreLoad1m.toFixed(1)}/core (${metrics.pressureLevel})`;
}

/**
 * @description Formats combined task run metrics as a one-line summary for logs
 * and plan_output_stream. Includes child process peak CPU%, wall-clock ratio,
 * and system load when available.
 *
 * @example
 * // Full example with all metrics:
 * // "Metrics: 45.2s wall, child peak 85%, ratio 2.5x (mixed), load 1.2/core (moderate)"
 *
 * @example
 * // Minimal example with only wall-clock:
 * // "Metrics: 120.5s wall, ratio 1.1x (cpu_bound)"
 */
export function formatTaskRunMetricsSummary(metrics: TaskRunMetrics): string {
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
    return 'Metrics: (no data)';
  }

  return `Metrics: ${parts.join(', ')}`;
}

/**
 * @description Determines overall workload characterization from combined metrics.
 * Uses wall-clock interpretation as primary, with child process CPU as secondary signal.
 *
 * @returns Interpretation string:
 * - 'cpu_bound': wall-clock ratio ≈ 1 and/or child CPU consistently high
 * - 'io_bound': wall-clock ratio high (>5x), lots of waiting
 * - 'mixed': moderate ratio (1.5-5x), some CPU and some waiting
 * - 'system_contention': system load is high despite low child CPU (multiple processes competing)
 * - 'unknown': insufficient data
 */
export function characterizeWorkload(metrics: TaskRunMetrics): string {
  const { childProcessMetrics, wallClockMetrics, systemCpuMetrics } = metrics;

  if (!wallClockMetrics) {
    return 'unknown';
  }

  const { interpretation: wallClockInterpretation } = wallClockMetrics;

  if (systemCpuMetrics && systemCpuMetrics.pressureLevel === 'high') {
    const childPeakCpu = childProcessMetrics?.peakCpuPercent ?? 0;
    if (childPeakCpu < 50) {
      return 'system_contention';
    }
  }

  if (wallClockInterpretation === 'cpu_bound') {
    return 'cpu_bound';
  }

  if (wallClockInterpretation === 'io_bound') {
    return 'io_bound';
  }

  if (wallClockInterpretation === 'mixed') {
    return 'mixed';
  }

  if (wallClockInterpretation === 'idle') {
    return 'idle';
  }

  return 'unknown';
}

/**
 * @description Formats a detailed multi-line metrics report suitable for logs or debugging.
 * Unlike formatTaskRunMetricsSummary, this includes full details of each metric type.
 */
export function formatTaskRunMetricsDetailed(metrics: TaskRunMetrics): string {
  const { childProcessMetrics, wallClockMetrics, systemCpuMetrics } = metrics;
  const lines: string[] = ['Task Run Metrics:'];

  if (wallClockMetrics) {
    lines.push(`  ${formatWallClockMetrics(wallClockMetrics)}`);
  }

  if (childProcessMetrics && childProcessMetrics.sampleCount > 0) {
    lines.push(`  ${formatChildProcessMetrics(childProcessMetrics)}`);
  }

  if (systemCpuMetrics) {
    lines.push(`  ${formatSystemCpuMetrics(systemCpuMetrics)}`);
  }

  const workload = characterizeWorkload(metrics);
  lines.push(`  Workload: ${workload}`);

  return lines.join('\n');
}
