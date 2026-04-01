/**
 * @description REST controller for process and system metrics.
 * GET /metrics returns current process snapshot (CPU and memory).
 * GET /metrics/system returns system-level metrics (load, PSI, active child processes).
 */

import { Controller, Get } from '@nestjs/common';
import type { ProcessMetricsSnapshot } from './process-metrics.types';
import { ProcessMetricsService } from './process-metrics.service';
import type { SystemMetricsSnapshot } from './system-metrics.types';
import { SystemMetricsService } from './system-metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly processMetrics: ProcessMetricsService,
    private readonly systemMetrics: SystemMetricsService,
  ) {}

  /**
   * @description Returns current process memory and CPU snapshot (RSS, heap, external in MB; CPU user/system in ms).
   */
  @Get()
  getMetrics(): ProcessMetricsSnapshot {
    return this.processMetrics.getCurrentSnapshot();
  }

  /**
   * @description Returns system-level metrics: load average, CPU pressure (PSI on Linux),
   * and count of active Ralph child processes. Useful for real-time monitoring during parallel job runs.
   */
  @Get('system')
  async getSystemMetrics(): Promise<SystemMetricsSnapshot> {
    return this.systemMetrics.getSystemSnapshot();
  }
}
