/**
 * A Ralph iteration runner on the production drivers engine — the same path
 * `@tools/workflows` `runIterationAsync` takes: the driver from the registry,
 * switched to structured output, its shell command spawned by `runDriverAsync`.
 *
 * Two deliberate differences, both for determinism: no hook plugin dirs (their
 * presence depends on the host env and their paths on the checkout), and no
 * trajectory capture (a side channel the orchestrator does not read back).
 */

import type { WorkflowRalphIterationRunner } from '@openthrottle/openthrottle-agentic-ralph';
import { withStructuredOutput } from '@openthrottle/openthrottle-agentic-utils';
import {
  type DriverChunk,
  getDriver,
  runDriverAsync,
} from '@openthrottle/openthrottle-drivers';

/**
 * Build the runner.
 *
 * @public
 */
export function createDriversIterationRunner(): WorkflowRalphIterationRunner {
  return {
    run: async (params) => {
      const driver = withStructuredOutput(getDriver(params.runner));
      const hostOnChunk = params.onChunk;
      let onChunk: ((chunk: DriverChunk) => void) | undefined;
      if (hostOnChunk !== undefined) {
        onChunk = (chunk) => {
          void Promise.resolve(
            hostOnChunk({ data: chunk.data, stream: chunk.stream }),
          );
        };
      }

      return runDriverAsync(
        driver,
        {
          cwd: params.cwd,
          effort: params.effort,
          env: params.env,
          iteration: params.iteration,
          model: params.model,
          onChunk,
          pluginDirs: [],
          prompt: params.agentPrompt,
          signal: params.signal,
          timeoutMs: params.timeoutMs,
        },
        {
          onAccountError: params.onAccountError,
          onUsageLimit: params.onUsageLimit,
        },
      );
    },
  };
}
