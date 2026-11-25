/**
 * @description GraphQL object type for Linux Pressure Stall Information (PSI) for CPU, used for
 * both the host (/proc/pressure/cpu) and the server's own cgroup (cpu.pressure).
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

import type { MetricScopeValue } from './metric-scope.enum.ts';
import { METRIC_SCOPE } from './metric-scope.enum.ts';

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

  @Field(() => METRIC_SCOPE, {
    description: `Whose pressure this is: host (/proc/pressure/cpu) or container (the server cgroup's cpu.pressure). Null on plan-run metrics recorded before scopes existed.`,
    nullable: true,
  })
  scope!: MetricScopeValue | null;
}
