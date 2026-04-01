/**
 * @description GraphQL resolver for metrics namespace. Exposes metrics { serverSnapshot, recentPlanRunsMetrics }.
 */

import { Args, ID, Int, Query, Resolver, ResolveField } from '@nestjs/graphql';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { EmitNotification } from '@openthrottle/nestjs-websockets';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { parseTaskRunMetricsFromReturnvalue } from '../queues/parse-task-run-metrics';
import { QueuesService } from '../queues/queues.service';
import { ServerMetricsObject } from '../health/server-metrics.object';
import { MetricsObject } from './metrics.object';
import { PlanRunMetricsEntryObject } from './plan-run-metrics-entry.object';

const METRICS_DEFAULT_RECENT_PLAN_RUNS_LIMIT = 10;
const METRICS_MAX_RECENT_PLAN_RUNS_LIMIT = 100;

@Resolver(() => MetricsObject)
export class MetricsResolver {
  constructor(
    private readonly processMetrics: ProcessMetricsService,
    private readonly queuesService: QueuesService,
  ) {}

  /**
   * @description Metrics namespace. Use metrics { serverSnapshot { rssMb, ... } } for current process metrics; recentPlanRunsMetrics(planId, limit) for plan-run history.
   */
  @Query(() => MetricsObject, {
    description: `Metrics namespace: serverSnapshot (current process metrics) and recentPlanRunsMetrics for plan-level visualization. serverMetrics at root is unchanged.`,
  })
  metrics(): MetricsObject {
    return {} as MetricsObject;
  }

  @ResolveField(() => ServerMetricsObject)
  serverSnapshot(): ServerMetricsObject {
    return this.processMetrics.getCurrentSnapshot() as ServerMetricsObject;
  }

  /**
   * @description Last N completed plan runs with task-run metrics for the given plan. Newest first.
   */
  @ResolveField(() => [PlanRunMetricsEntryObject])
  @EmitNotification(NOTIFICATION_EVENT_NAMES.DEBUG, (ret) => ({
    data: ret,
    message: 'Metrics: recent plan runs metrics',
    severity: 'info' as const,
  }))
  async recentPlanRunsMetrics(
    @Args('planId', { type: () => ID }) planId: string,
    @Args('limit', {
      defaultValue: METRICS_DEFAULT_RECENT_PLAN_RUNS_LIMIT,
      nullable: true,
      type: () => Int,
    })
    limit: number | null,
  ): Promise<PlanRunMetricsEntryObject[]> {
    const effectiveLimit = Math.min(
      Math.max(1, limit ?? METRICS_DEFAULT_RECENT_PLAN_RUNS_LIMIT),
      METRICS_MAX_RECENT_PLAN_RUNS_LIMIT,
    );

    const dtos = await this.queuesService.getCompletedJobsByPlanId(
      planId,
      effectiveLimit,
    );

    return dtos.map((dto) => {
      const entry = new PlanRunMetricsEntryObject();

      entry.jobId = dto.id;
      entry.finishedOn = dto.finishedOn;
      entry.taskRunMetrics = parseTaskRunMetricsFromReturnvalue(
        dto.returnvalue,
      );

      return entry;
    });
  }
}
