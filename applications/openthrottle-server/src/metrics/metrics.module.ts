/**
 * @description Module for process and system metrics (CPU, memory, load, PSI).
 * Exports ProcessMetricsService for use by health/metrics endpoints and plans processor.
 * Exposes GET /metrics for process snapshot and GET /metrics/system for system-level profiling.
 */

import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ProcessMetricsService } from './process-metrics.service';
import { SystemMetricsService } from './system-metrics.service';

@Module({
  controllers: [MetricsController],
  exports: [ProcessMetricsService, SystemMetricsService],
  providers: [ProcessMetricsService, SystemMetricsService],
})
export class MetricsModule {}
