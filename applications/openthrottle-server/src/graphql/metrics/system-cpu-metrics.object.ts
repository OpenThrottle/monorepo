/**
 * @description GraphQL object types for system-level CPU pressure metrics.
 * Captures load average
 * and Linux PSI metrics at job start/end.
 */

import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import {
  ContainerCpuWindowObject,
  ContainerMetricsObject,
} from './container-metrics.object.ts';
import type { MetricScopeValue } from './metric-scope.enum.ts';
import { METRIC_SCOPE } from './metric-scope.enum.ts';
import { PsiCpuMetricsObject } from './psi-cpu-metrics.object.ts';

export const PRESSURE_LEVEL = {
  high: 'high',
  low: 'low',
  moderate: 'moderate',
  unknown: 'unknown',
} as const;

export type PressureLevelKey = keyof typeof PRESSURE_LEVEL;
export type PressureLevelValue = (typeof PRESSURE_LEVEL)[PressureLevelKey];

registerEnumType(PRESSURE_LEVEL, {
  description: `System CPU pressure level interpretation.`,
  name: 'PressureLevel',
});

@ObjectType('LoadAverageMetrics', {
  description: `System load average from os.loadavg().`,
})
export class LoadAverageMetricsObject {
  @Field(() => Int, {
    description: `Number of logical CPUs.`,
  })
  cpuCount!: number;

  @Field(() => Float, {
    description: `15-minute load average.`,
  })
  load15m!: number;

  @Field(() => Float, {
    description: `1-minute load average.`,
  })
  load1m!: number;

  @Field(() => Float, {
    description: `5-minute load average.`,
  })
  load5m!: number;

  @Field(() => Float, {
    description: `Per-core load (load1m / cpuCount). > 1 means oversubscribed. Host-wide: inside a container, cpuCount is the host's CPUs, not the container's cpu.max limit.`,
  })
  perCoreLoad1m!: number;

  @Field(() => METRIC_SCOPE, {
    description: `Always host when set: os.loadavg() counts every process on the machine. Null on plan-run metrics recorded before scopes existed.`,
    nullable: true,
  })
  scope!: MetricScopeValue | null;
}

@ObjectType('SystemCpuSnapshot', {
  description: `System-level CPU metrics snapshot at a point in time.`,
})
export class SystemCpuSnapshotObject {
  @Field(() => ContainerMetricsObject, {
    description: `The server's own cgroup limits and usage at snapshot time. Null on runs recorded before container metrics existed.`,
    nullable: true,
  })
  container!: ContainerMetricsObject | null;

  @Field(() => LoadAverageMetricsObject, {
    description: `Load average at snapshot time.`,
  })
  loadAverage!: LoadAverageMetricsObject;

  @Field(() => PsiCpuMetricsObject, {
    description: `PSI metrics at snapshot time (Linux only).`,
  })
  psi!: PsiCpuMetricsObject;

  @Field(() => Float, {
    description: `Timestamp when snapshot was taken (Unix ms).`,
  })
  timestamp!: number;
}

@ObjectType('SystemCpuMetrics', {
  description: `Complete system CPU metrics for a job, including start/end snapshots and pressure interpretation.`,
})
export class SystemCpuMetricsObject {
  @Field(() => SystemCpuSnapshotObject, {
    description: `Snapshot at job end.`,
  })
  atEnd!: SystemCpuSnapshotObject;

  @Field(() => SystemCpuSnapshotObject, {
    description: `Snapshot at job start.`,
  })
  atStart!: SystemCpuSnapshotObject;

  @Field(() => ContainerCpuWindowObject, {
    description: `The server cgroup's CPU usage and throttling over the whole job (atStart to atEnd). Null outside a cgroup or on older runs.`,
    nullable: true,
  })
  containerCpuWindow!: ContainerCpuWindowObject | null;

  @Field(() => String, {
    description: `Platform: linux, darwin, win32, etc.`,
  })
  platform!: string;

  @Field(() => METRIC_SCOPE, {
    description: `What pressureLevel was judged on: container (usage and throttling against the cgroup's cpu.max limit) or host (load average and PSI). Null on runs recorded before scopes existed, which were always host.`,
    nullable: true,
  })
  pressureBasis!: MetricScopeValue | null;

  @Field(() => PRESSURE_LEVEL, {
    description: `Interpretation of CPU pressure: low, moderate, high, or unknown. Judged on the container's own CPU limit when the server has one, otherwise on host load and PSI — see pressureBasis.`,
  })
  pressureLevel!: PressureLevelValue;

  @Field(() => Float, {
    description: `Delta in PSI full stall time (microseconds) during the job.`,
    nullable: true,
  })
  psiFullDeltaUs!: number | null;

  @Field(() => Float, {
    description: `Delta in PSI some stall time (microseconds) during the job.`,
    nullable: true,
  })
  psiSomeDeltaUs!: number | null;

  @Field(() => Boolean, {
    description: `Whether PSI metrics are available (Linux with cgroup v2).`,
  })
  psiAvailable!: boolean;
}
