/**
 * @description GraphQL object types for the server's own cgroup v2 metrics: its CPU and memory
 * limits, usage and throttling. Inside a container these are the numbers the host-wide load
 * average and PSI cannot show.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

import type { MetricScopeValue } from './metric-scope.enum.ts';
import { METRIC_SCOPE } from './metric-scope.enum.ts';
import { PsiCpuMetricsObject } from './psi-cpu-metrics.object.ts';

@ObjectType('ContainerCpuMetrics', {
  description: `The server cgroup's CPU limit (cpu.max) and cumulative accounting (cpu.stat) since the cgroup was created.`,
})
export class ContainerCpuMetricsObject {
  @Field(() => Float, {
    description: `vCPUs allowed by cpu.max (quota / period). Null when unlimited.`,
    nullable: true,
  })
  limitVcpus!: number | null;

  @Field(() => Float, {
    description: `CFS enforcement periods elapsed (cpu.stat nr_periods).`,
    nullable: true,
  })
  nrPeriods!: number | null;

  @Field(() => Float, {
    description: `Periods in which the cgroup was throttled (cpu.stat nr_throttled).`,
    nullable: true,
  })
  nrThrottled!: number | null;

  @Field(() => Float, {
    description: `Total time throttled, in microseconds (cpu.stat throttled_usec).`,
    nullable: true,
  })
  throttledUsec!: number | null;

  @Field(() => Float, {
    description: `Total CPU time used, in microseconds (cpu.stat usage_usec).`,
    nullable: true,
  })
  usageUsec!: number | null;
}

@ObjectType('ContainerCpuWindow', {
  description: `The server cgroup's CPU usage and throttling between two reads, so it describes recent behaviour rather than totals.`,
})
export class ContainerCpuWindowObject {
  @Field(() => Float, {
    description: `Length of the window in milliseconds.`,
  })
  elapsedMs!: number;

  @Field(() => Float, {
    description: `Share of CFS periods in the window that were throttled, 0–1.`,
    nullable: true,
  })
  throttledPeriodRatio!: number | null;

  @Field(() => Float, {
    description: `CPU used in the window as a share of the cpu.max limit; above ~0.9 the container is at its ceiling. Null when unlimited.`,
    nullable: true,
  })
  usageRatioOfLimit!: number | null;

  @Field(() => Float, {
    description: `Average vCPUs used over the window.`,
    nullable: true,
  })
  usedVcpus!: number | null;
}

@ObjectType('ContainerMemoryEvents', {
  description: `Counters from the server cgroup's memory.events, cumulative since it was created.`,
})
export class ContainerMemoryEventsObject {
  @Field(() => Float, {
    description: `Times usage went over memory.high and was throttled.`,
  })
  high!: number;

  @Field(() => Float, {
    description: `Times usage hit memory.max.`,
  })
  max!: number;

  @Field(() => Float, {
    description: `Times the OOM killer was invoked for this cgroup.`,
  })
  oom!: number;

  @Field(() => Float, {
    description: `Processes in this cgroup killed by the OOM killer. Non-zero means the memory limit is too small.`,
  })
  oomKill!: number;
}

@ObjectType('ContainerMemoryMetrics', {
  description: `The server cgroup's memory limit and usage.`,
})
export class ContainerMemoryMetricsObject {
  @Field(() => Float, {
    description: `Current usage in bytes (memory.current).`,
    nullable: true,
  })
  currentBytes!: number | null;

  @Field(() => ContainerMemoryEventsObject, {
    description: `OOM and limit counters (memory.events). Null when unreadable.`,
    nullable: true,
  })
  events!: ContainerMemoryEventsObject | null;

  @Field(() => Float, {
    description: `memory.high throttle threshold in bytes. Null when unlimited.`,
    nullable: true,
  })
  highBytes!: number | null;

  @Field(() => Float, {
    description: `memory.max hard limit in bytes. Null when unlimited.`,
    nullable: true,
  })
  limitBytes!: number | null;
}

@ObjectType('ContainerMetrics', {
  description: `The server's own cgroup v2 limits, usage and pressure. When available is false only unavailableReason is set (macOS, cgroup v1, unreadable files).`,
})
export class ContainerMetricsObject {
  @Field(() => Boolean, {
    description: `Whether the server's cgroup v2 was found and read.`,
  })
  available!: boolean;

  @Field(() => ContainerCpuMetricsObject, {
    description: `CPU limit and cumulative accounting.`,
    nullable: true,
  })
  cpu!: ContainerCpuMetricsObject | null;

  @Field(() => ContainerCpuWindowObject, {
    description: `CPU usage and throttling since the previous read (or over the run, on plan-run metrics).`,
    nullable: true,
  })
  cpuWindow!: ContainerCpuWindowObject | null;

  @Field(() => ContainerMemoryMetricsObject, {
    description: `Memory limit, usage and OOM counters.`,
    nullable: true,
  })
  memory!: ContainerMemoryMetricsObject | null;

  @Field(() => String, {
    description: `Absolute path of the cgroup directory that was read.`,
    nullable: true,
  })
  path!: string | null;

  @Field(() => PsiCpuMetricsObject, {
    description: `The cgroup's own CPU pressure (cpu.pressure), not the host's.`,
    nullable: true,
  })
  psi!: PsiCpuMetricsObject | null;

  @Field(() => METRIC_SCOPE, {
    description: `Always container.`,
  })
  scope!: MetricScopeValue;

  @Field(() => String, {
    description: `Why the cgroup could not be read, when available is false.`,
    nullable: true,
  })
  unavailableReason!: string | null;
}
