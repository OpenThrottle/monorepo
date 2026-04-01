/**
 * @description Types for server and task-run metrics. Align with tools/workflows/docs/server-and-task-metrics.md and openthrottle-server ProcessMetricsSnapshot / TaskRunMetrics.
 */

/** Process memory and CPU snapshot (units: MB for memory, ms for CPU). Same shape as REST GET /metrics and GraphQL serverMetrics. */
export interface ProcessMetricsSnapshot {
  readonly cpuSystemMs: number;
  readonly cpuUserMs: number;
  readonly externalMb: number;
  readonly heapTotalMb: number;
  readonly heapUsedMb: number;
  readonly rssMb: number;
}

/** Metrics captured at job start and end for a plan/task run. From job(jobId, queueName: "plans") returnvalue / taskRunMetrics. */
export interface TaskRunMetrics {
  readonly atEnd: ProcessMetricsSnapshot;
  readonly atStart: ProcessMetricsSnapshot;
}

/** Job with task-run metrics. Subset of GraphQL JobObject when querying job(jobId, queueName: "plans") with taskRunMetrics. */
export interface JobWithTaskRunMetrics {
  readonly id: string;
  readonly taskRunMetrics: TaskRunMetrics | null;
}
