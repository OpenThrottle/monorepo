/**
 * @description Wall-clock metrics — canonical implementation in @openthrottle/openthrottle-agentic-utils.
 * `formatWallClockMetrics` remains here until the next extraction task.
 */

export {
  createWallClockMetrics,
  type WallClockMetrics,
} from '@openthrottle/openthrottle-agentic-utils';

import type { WallClockMetrics } from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description Formats wall-clock metrics as a one-line summary for logs.
 */
export function formatWallClockMetrics(metrics: WallClockMetrics): string {
  const durationSec = (metrics.wallClockMs / 1000).toFixed(1);
  const cpuSec = (metrics.cpuTimeMs / 1000).toFixed(1);
  const ratio =
    metrics.wallClockToCpuRatio === Infinity
      ? '∞'
      : metrics.wallClockToCpuRatio.toFixed(2);

  return `Wall clock: ${durationSec}s, CPU: ${cpuSec}s (user: ${(metrics.cpuUserMs / 1000).toFixed(1)}s, sys: ${(metrics.cpuSystemMs / 1000).toFixed(1)}s), ratio: ${ratio}x (${metrics.interpretation})`;
}
