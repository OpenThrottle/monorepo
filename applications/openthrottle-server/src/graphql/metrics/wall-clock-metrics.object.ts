/**
 * @description GraphQL object type for wall-clock duration vs CPU time metrics.
 * Aligns with tools/workflows WallClockMetrics type. Used to determine if jobs
 * are CPU-bound, I/O-bound, or wait-bound.
 */

import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';

export const WallClockInterpretation = {
  cpu_bound: 'cpu_bound',
  idle: 'idle',
  io_bound: 'io_bound',
  mixed: 'mixed',
} as const;

export type WallClockInterpretationType =
  (typeof WallClockInterpretation)[keyof typeof WallClockInterpretation];

registerEnumType(WallClockInterpretation, {
  description: `Interpretation of wall-clock to CPU time ratio.`,
  name: 'WallClockInterpretation',
});

@ObjectType('WallClockMetrics', {
  description: `Wall-clock and CPU time metrics for determining job workload characteristics.`,
})
export class WallClockMetricsObject {
  @Field(() => Float, {
    description: `CPU system time delta in milliseconds.`,
  })
  cpuSystemMs!: number;

  @Field(() => Float, {
    description: `Total CPU time (user + system) in milliseconds.`,
  })
  cpuTimeMs!: number;

  @Field(() => Float, {
    description: `CPU user time delta in milliseconds.`,
  })
  cpuUserMs!: number;

  @Field(() => Float, {
    description: `End timestamp (Unix ms) when job completed.`,
  })
  endTimestamp!: number;

  @Field(() => WallClockInterpretation, {
    description: `Interpretation hint: cpu_bound (ratio <= 1.5), mixed (1.5-5), io_bound (> 5), idle (no CPU time).`,
  })
  interpretation!: WallClockInterpretationType;

  @Field(() => Float, {
    description: `Start timestamp (Unix ms) when job began.`,
  })
  startTimestamp!: number;

  @Field(() => Float, {
    description: `Wall-clock duration in milliseconds.`,
  })
  wallClockMs!: number;

  @Field(() => Float, {
    description: `Ratio of wall-clock to CPU time. ~1 = CPU-bound, > 5 = I/O-bound.`,
  })
  wallClockToCpuRatio!: number;
}
