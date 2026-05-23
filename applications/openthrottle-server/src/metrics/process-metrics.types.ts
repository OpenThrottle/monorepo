/**
 * @description Snapshot of Node process memory and CPU for server and task-run metrics.
 * Aligns with tools/workflows/docs/server-and-task-metrics.md.
 */

import type {
  ChildProcessMetrics,
  SystemCpuMetrics,
  WallClockMetrics,
} from '@tools/workflows';

/** Process memory and CPU snapshot (units: MB for memory, ms for CPU). */
export interface ProcessMetricsSnapshot {
  readonly cpuSystemMs: number;
  readonly cpuUserMs: number;
  readonly externalMb: number;
  readonly heapTotalMb: number;
  readonly heapUsedMb: number;
  readonly rssMb: number;
}

/**
 * @description Metrics captured at job start and end for a plan/task run.
 * Used so "CPU and memory while running" can be reported (e.g. in job returnvalue or API).
 */
export interface TaskRunMetrics {
  readonly atEnd: ProcessMetricsSnapshot;
  readonly atStart: ProcessMetricsSnapshot;
}

/**
 * @description Enhanced metrics for task runs that includes child process,
 * wall-clock, and system CPU metrics in addition to the process snapshots.
 * Backward compatible: composes TaskRunMetrics with optional new fields.
 *
 * - childProcessMetrics: peak/avg CPU%, peak/avg RSS from pidusage polling of spawned processes
 * - wallClockMetrics: wall-clock duration vs CPU time (ratio, interpretation for CPU/IO bound)
 * - systemCpuMetrics: system load average and Linux PSI pressure data
 */
export interface EnhancedTaskRunMetrics extends TaskRunMetrics {
  /** Child process CPU/memory metrics from pidusage polling (if available). */
  readonly childProcessMetrics?: ChildProcessMetrics;
  /** System-level CPU pressure metrics (load average, PSI on Linux). */
  readonly systemCpuMetrics?: SystemCpuMetrics;
  /** Wall-clock vs CPU time metrics for determining CPU/IO bound behavior. */
  readonly wallClockMetrics?: WallClockMetrics;
}
