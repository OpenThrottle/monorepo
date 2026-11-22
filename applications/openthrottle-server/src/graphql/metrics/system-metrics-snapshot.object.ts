/**
 * @description GraphQL object types for the live system snapshot (the same data as REST
 * GET /metrics/system): host load, host memory and PSI next to the server's own cgroup.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { ContainerMetricsObject } from './container-metrics.object.ts';
import type { MetricScopeType } from './metric-scope.enum.ts';
import { MetricScope } from './metric-scope.enum.ts';
import { PsiCpuMetricsObject } from './psi-cpu-metrics.object.ts';
import type { PressureLevelType } from './system-cpu-metrics.object.ts';
import {
  LoadAverageMetricsObject,
  PressureLevel,
} from './system-cpu-metrics.object.ts';

@ObjectType('HostMemoryMetrics', {
  description: `Host memory from os.totalmem()/os.freemem(). Inside a container this is the host's (or VM's) memory, not the container's limit — see ContainerMetrics.memory for that.`,
})
export class HostMemoryMetricsObject {
  @Field(() => Float, {
    description: `Free host memory in bytes.`,
  })
  freeBytes!: number;

  @Field(() => MetricScope, {
    description: `Always host.`,
  })
  scope!: MetricScopeType;

  @Field(() => Float, {
    description: `Total host memory in bytes.`,
  })
  totalBytes!: number;

  @Field(() => Float, {
    description: `(total - free) / total, 0–1.`,
  })
  usedRatio!: number;
}

@ObjectType('ActiveProcessesMetrics', {
  description: `Worktree-backed runs the server is tracking.`,
})
export class ActiveProcessesMetricsObject {
  @Field(() => Int, {
    description: `Worktrees currently locked by a run.`,
  })
  activeWorktreeCount!: number;

  @Field(() => [String], {
    description: `Job ids holding a worktree lock.`,
  })
  lockedWorktrees!: string[];

  @Field(() => MetricScope, {
    description: `Always process.`,
  })
  scope!: MetricScopeType;

  @Field(() => Int, {
    description: `Worktrees known to the tracker.`,
  })
  totalWorktreeCount!: number;
}

@ObjectType('SystemMetricsSnapshot', {
  description: `Live system metrics, each group labelled with its scope: host-wide load, memory and PSI next to the server's own cgroup limits, usage and throttling.`,
})
export class SystemMetricsSnapshotObject {
  @Field(() => ActiveProcessesMetricsObject, {
    description: `Worktree-backed runs the server is tracking.`,
  })
  activeProcesses!: ActiveProcessesMetricsObject;

  @Field(() => ContainerMetricsObject, {
    description: `The server's own cgroup limits, usage and throttling, or why there is none.`,
  })
  container!: ContainerMetricsObject;

  @Field(() => HostMemoryMetricsObject, {
    description: `Host memory.`,
  })
  hostMemory!: HostMemoryMetricsObject;

  @Field(() => LoadAverageMetricsObject, {
    description: `Host load average.`,
  })
  loadAverage!: LoadAverageMetricsObject;

  @Field(() => String, {
    description: `Platform: linux, darwin, win32, etc.`,
  })
  platform!: string;

  @Field(() => MetricScope, {
    description: `What pressureLevel was judged on: container when the server has a cgroup CPU limit, otherwise host.`,
  })
  pressureBasis!: MetricScopeType;

  @Field(() => PressureLevel, {
    description: `Interpretation of CPU pressure: low, moderate, high, or unknown.`,
  })
  pressureLevel!: PressureLevelType;

  @Field(() => PsiCpuMetricsObject, {
    description: `Host PSI (/proc/pressure/cpu). Null fields off Linux.`,
  })
  psi!: PsiCpuMetricsObject;

  @Field(() => Boolean, {
    description: `Whether host PSI is available.`,
  })
  psiAvailable!: boolean;

  @Field(() => Float, {
    description: `When the snapshot was taken (Unix ms).`,
  })
  timestamp!: number;
}
