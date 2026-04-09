/**
 * @description GraphQL resolver for Database health, server health, and server metrics. databaseHealth for status page (DB); serverHealth returns API, DB, Redis; serverMetrics returns process CPU and memory.
 */

import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { HealthService } from './health.service';
import { ServerHealthObject } from './server-health.object';
import { ServerMetricsObject } from './server-metrics.object';

/** Database health status: ok, unconfigured, or unreachable. */
export type HealthStatus = 'ok' | 'unconfigured' | 'unreachable';

@Public()
@Resolver()
export class HealthResolver {
  constructor(
    private readonly healthService: HealthService,
    private readonly processMetrics: ProcessMetricsService,
  ) {}

  /**
   * @description Database health for status page. Returns "ok" if DB is reachable, "unconfigured" if no config, "unreachable" on error.
   */
  @Query(() => String, {
    description: `Database health: ok | unconfigured | unreachable. Used by app status page.`,
  })
  async databaseHealth(): Promise<HealthStatus> {
    return this.healthService.getDatabaseStatus();
  }

  /**
   * @description Server health: API (ok when resolver runs), OpenThrottle DB, Redis (BullMQ), and WebSocket. Each component is ok, unconfigured, or unreachable.
   */
  @Query(() => ServerHealthObject, {
    description: `Server health: API, OpenThrottle DB, Redis (BullMQ), and WebSocket. Each component is ok | unconfigured | unreachable.`,
  })
  async serverHealth(): Promise<ServerHealthObject> {
    return this.healthService.getServerHealth();
  }

  /**
   * @description Current process metrics: memory (RSS, heap, external in MB) and CPU (user/system in ms). Same data as GET /metrics.
   */
  @Query(() => ServerMetricsObject, {
    description: `Current process CPU and memory snapshot. Memory in MB; CPU in ms (cumulative). Same data as REST GET /metrics.`,
  })
  serverMetrics(): ServerMetricsObject {
    return this.processMetrics.getCurrentSnapshot();
  }
}
