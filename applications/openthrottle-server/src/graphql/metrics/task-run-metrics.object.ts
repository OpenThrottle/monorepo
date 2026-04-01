/**
 * @description GraphQL object type for task-run metrics including process snapshots,
 * child process metrics, wall-clock metrics, and system CPU metrics.
 * Aligns with tools/workflows TaskRunMetrics and process-metrics-format types.
 * Used by JobObject.taskRunMetrics for plans-queue job returnvalue visualization.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { ChildProcessMetricsObject } from './child-process-metrics.object';
import { ProcessMetricsSnapshotObject } from './process-metrics-snapshot.object';
import { SystemCpuMetricsObject } from './system-cpu-metrics.object';
import { WallClockMetricsObject } from './wall-clock-metrics.object';

@ObjectType('TaskRunMetrics', {
  description: `Metrics captured at job start and end for a plan/task run, including process snapshots, child process resource usage, wall-clock analysis, and system CPU pressure.`,
})
export class TaskRunMetricsObject {
  @Field(() => ProcessMetricsSnapshotObject, {
    description: `Process metrics at the end of the task run.`,
  })
  atEnd!: ProcessMetricsSnapshotObject;

  @Field(() => ProcessMetricsSnapshotObject, {
    description: `Process metrics at the start of the task run.`,
  })
  atStart!: ProcessMetricsSnapshotObject;

  @Field(() => ChildProcessMetricsObject, {
    description: `Aggregated CPU and memory metrics for spawned child processes.`,
    nullable: true,
  })
  childProcessMetrics?: ChildProcessMetricsObject;

  @Field(() => SystemCpuMetricsObject, {
    description: `System-level CPU metrics including load average and PSI.`,
    nullable: true,
  })
  systemCpuMetrics?: SystemCpuMetricsObject;

  @Field(() => WallClockMetricsObject, {
    description: `Wall-clock vs CPU time metrics for workload characterization.`,
    nullable: true,
  })
  wallClockMetrics?: WallClockMetricsObject;
}
