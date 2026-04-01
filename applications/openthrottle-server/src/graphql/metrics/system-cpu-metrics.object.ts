/**
 * @description GraphQL object types for system-level CPU pressure metrics.
 * Aligns with tools/workflows SystemCpuMetrics type. Captures load average
 * and Linux PSI metrics at job start/end.
 */

import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export const PressureLevel = {
  high: 'high',
  low: 'low',
  moderate: 'moderate',
  unknown: 'unknown',
} as const;

export type PressureLevelType =
  (typeof PressureLevel)[keyof typeof PressureLevel];

registerEnumType(PressureLevel, {
  description: `System CPU pressure level interpretation.`,
  name: 'PressureLevel',
});

@ObjectType('PsiCpuMetrics', {
  description: `Linux Pressure Stall Information (PSI) for CPU. Null fields on non-Linux platforms.`,
})
export class PsiCpuMetricsObject {
  @Field(() => Float, {
    description: `Percentage of time all runnable tasks stalled (10s avg).`,
    nullable: true,
  })
  full10s!: number | null;

  @Field(() => Float, {
    description: `Percentage of time all runnable tasks stalled (300s avg).`,
    nullable: true,
  })
  full300s!: number | null;

  @Field(() => Float, {
    description: `Percentage of time all runnable tasks stalled (60s avg).`,
    nullable: true,
  })
  full60s!: number | null;

  @Field(() => Float, {
    description: `Total full stall time in microseconds (cumulative since boot).`,
    nullable: true,
  })
  fullTotalUs!: number | null;

  @Field(() => Float, {
    description: `Percentage of time at least one task stalled (10s avg).`,
    nullable: true,
  })
  some10s!: number | null;

  @Field(() => Float, {
    description: `Percentage of time at least one task stalled (300s avg).`,
    nullable: true,
  })
  some300s!: number | null;

  @Field(() => Float, {
    description: `Percentage of time at least one task stalled (60s avg).`,
    nullable: true,
  })
  some60s!: number | null;

  @Field(() => Float, {
    description: `Total some stall time in microseconds (cumulative since boot).`,
    nullable: true,
  })
  someTotalUs!: number | null;
}

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
    description: `Per-core load (load1m / cpuCount). > 1 means oversubscribed.`,
  })
  perCoreLoad1m!: number;
}

@ObjectType('SystemCpuSnapshot', {
  description: `System-level CPU metrics snapshot at a point in time.`,
})
export class SystemCpuSnapshotObject {
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

  @Field(() => String, {
    description: `Platform: linux, darwin, win32, etc.`,
  })
  platform!: string;

  @Field(() => PressureLevel, {
    description: `Interpretation of system CPU pressure: low, moderate, high, or unknown.`,
  })
  pressureLevel!: PressureLevelType;

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
