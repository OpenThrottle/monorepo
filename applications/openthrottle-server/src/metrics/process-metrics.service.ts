/**
 * @description Collects Node process memory and CPU snapshots for server and task-run metrics.
 * See tools/workflows/docs/server-and-task-metrics.md.
 */

import { Injectable } from '@nestjs/common';
import type { ProcessMetricsSnapshot } from './process-metrics.types';

const METRICS_BYTES_PER_MB = 1024 * 1024;
const METRICS_MICROSECONDS_PER_MS = 1000;

/**
 * @description Converts bytes to MB rounded to 2 decimal places.
 */
function bytesToMb(bytes: number): number {
  return Math.round((bytes / METRICS_BYTES_PER_MB) * 100) / 100;
}

/**
 * @description Converts CPU microseconds to milliseconds.
 */
function microToMs(micro: number): number {
  return micro / METRICS_MICROSECONDS_PER_MS;
}

@Injectable()
export class ProcessMetricsService {
  /**
   * @description Returns a current snapshot of process memory and CPU (cumulative).
   * Memory from process.memoryUsage(); CPU from process.cpuUsage() in ms.
   */
  getCurrentSnapshot(): ProcessMetricsSnapshot {
    const cpu = process.cpuUsage();
    const mem = process.memoryUsage();

    return {
      cpuSystemMs: microToMs(cpu.system),
      cpuUserMs: microToMs(cpu.user),
      externalMb: bytesToMb(mem.external),
      heapTotalMb: bytesToMb(mem.heapTotal),
      heapUsedMb: bytesToMb(mem.heapUsed),
      rssMb: bytesToMb(mem.rss),
    };
  }

  /**
   * @description Computes approximate CPU usage percent over a short window (two snapshots).
   * Returns 0–100. Useful for "current load %" in an endpoint; optional per the metrics doc.
   */
  async getCpuUsagePercent(windowMs: number = 100): Promise<number> {
    const before = process.cpuUsage();
    await new Promise((resolve) => setTimeout(resolve, windowMs));
    const after = process.cpuUsage(before);

    const deltaMicro = after.user + after.system;
    const windowMicro = windowMs * METRICS_MICROSECONDS_PER_MS;
    const fraction = deltaMicro / windowMicro;
    const percent = Math.min(100, Math.max(0, fraction * 100));

    return Math.round(percent * 100) / 100;
  }
}
