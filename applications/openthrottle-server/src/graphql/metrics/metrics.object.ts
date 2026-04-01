/**
 * @description Root object for metrics namespace. serverSnapshot is the current process
 * metrics (same as serverMetrics query); recentPlanRunsMetrics for plan-level run history with metrics.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { ServerMetricsObject } from '../health/server-metrics.object';
import { PlanRunMetricsEntryObject } from './plan-run-metrics-entry.object';

@ObjectType({
  description: `Metrics namespace: server snapshot and plan-run metrics. serverMetrics at root remains for backward compatibility.`,
})
export class MetricsObject {
  @Field(() => [PlanRunMetricsEntryObject], {
    description: `Last N completed plan runs with task-run metrics for the given plan. Ordered newest first. Use for plan-level metrics visualization.`,
  })
  recentPlanRunsMetrics!: PlanRunMetricsEntryObject[];

  @Field(() => ServerMetricsObject, {
    description: `Current process CPU and memory snapshot. Same data as root serverMetrics query.`,
  })
  serverSnapshot!: ServerMetricsObject;
}
