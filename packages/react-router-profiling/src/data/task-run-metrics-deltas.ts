/**
 * @description Computes per-metric deltas (atEnd − atStart) for task-run metrics. Used for display (e.g. "CPU consumed during run").
 */

import type { ProcessMetricsSnapshot } from './metrics-types';

/**
 * @description Returns snapshot where each field is (atEnd - atStart). Delta = amount consumed or changed during the run.
 */
export function computeTaskRunDeltas(
  atStart: ProcessMetricsSnapshot,
  atEnd: ProcessMetricsSnapshot,
): ProcessMetricsSnapshot {
  return {
    cpuSystemMs: atEnd.cpuSystemMs - atStart.cpuSystemMs,
    cpuUserMs: atEnd.cpuUserMs - atStart.cpuUserMs,
    externalMb: atEnd.externalMb - atStart.externalMb,
    heapTotalMb: atEnd.heapTotalMb - atStart.heapTotalMb,
    heapUsedMb: atEnd.heapUsedMb - atStart.heapUsedMb,
    rssMb: atEnd.rssMb - atStart.rssMb,
  };
}
