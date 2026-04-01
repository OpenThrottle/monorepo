/**
 * @description GraphQL object type for child process CPU/memory metrics.
 * Aligns with tools/workflows ChildProcessMetrics type. Captures aggregated
 * resource usage of spawned child processes during task execution.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('ChildProcessMetrics', {
  description: `Aggregated CPU and memory metrics for a child process over its lifetime.`,
})
export class ChildProcessMetricsObject {
  @Field(() => Float, {
    description: `Average CPU percentage across all samples.`,
  })
  avgCpuPercent!: number;

  @Field(() => Float, {
    description: `Average RSS in MB across all samples.`,
  })
  avgRssMb!: number;

  @Field(() => Float, {
    description: `Peak CPU percentage observed across all samples.`,
  })
  peakCpuPercent!: number;

  @Field(() => Float, {
    description: `Peak RSS in MB observed across all samples.`,
  })
  peakRssMb!: number;

  @Field(() => Int, {
    description: `Process ID of the child that was monitored.`,
  })
  pid!: number;

  @Field(() => Int, {
    description: `Polling interval in milliseconds.`,
  })
  pollIntervalMs!: number;

  @Field(() => Int, {
    description: `Number of samples taken.`,
  })
  sampleCount!: number;
}
