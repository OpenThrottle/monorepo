/**
 * @description Child process metrics — collector in @openthrottle/openthrottle-agentic-utils.
 * This module retains {@link sampleChildProcess} until a later extraction task.
 */

import pidusage from 'pidusage';

import type { ChildProcessSample } from '../types/child-process-metrics';

export {
  createChildProcessMetricsCollector,
  type ChildProcessMetricsCollector,
} from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description One-shot helper: polls a PID once and returns a single sample.
 * Useful for quick profiling or tests.
 */
export async function sampleChildProcess(
  pid: number,
): Promise<ChildProcessSample | null> {
  try {
    const stats = await pidusage(pid);
    const BYTES_PER_MB = 1024 * 1024;

    return {
      cpu: stats.cpu,
      elapsedMs: 0,
      rssMb: stats.memory / BYTES_PER_MB,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}
