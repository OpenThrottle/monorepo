import {
  AGENTIC_TEST_ECHO_COUNT,
  AGENTIC_TEST_ECHO_INTERVAL_MS,
} from './agentic-test.constants';
import type { AgenticTestJobResult } from './agentic-test.types';

export interface RunAgenticTestEchoLoopOptions {
  readonly echoCount?: number;
  readonly intervalMs?: number;
  readonly now?: () => Date;
  readonly onEcho: (timestamp: string, index: number) => void;
  readonly sleep: (ms: number) => Promise<void>;
}

/**
 * @description Echoes ISO timestamps once per interval for the configured count (~30s by default).
 */
export const runAgenticTestEchoLoop = async (
  options: RunAgenticTestEchoLoopOptions,
): Promise<AgenticTestJobResult> => {
  const echoCount = options.echoCount ?? AGENTIC_TEST_ECHO_COUNT;
  const intervalMs = options.intervalMs ?? AGENTIC_TEST_ECHO_INTERVAL_MS;
  const now = options.now ?? ((): Date => new Date());
  const timestamps: string[] = [];

  for (let index = 0; index < echoCount; index += 1) {
    const timestamp = now().toISOString();
    timestamps.push(timestamp);
    options.onEcho(timestamp, index);
    if (index < echoCount - 1) {
      // eslint-disable-next-line no-await-in-loop
      await options.sleep(intervalMs);
    }
  }

  return {
    echoedCount: timestamps.length,
    timestamps,
  };
};
