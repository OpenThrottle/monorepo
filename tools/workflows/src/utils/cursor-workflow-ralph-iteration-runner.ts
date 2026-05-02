/**
 * @description Factory for a {@link WorkflowRalphIterationRunner}-compatible Cursor iteration runner
 * (see `@openthrottle/openthrottle-workflows` `WorkflowRalphOrchestratorDeps.iterationRunner`).
 * Wraps {@link runIterationAsync} so hosts can attach streaming side effects without duplicating field mapping.
 */

import { runIterationAsync } from '../bin/run-iteration';
import type { CursorAgentChunk } from '../bin/run-iteration';
import type { RalphExecutionBackendId } from './ralph-execution-backend';

/**
 * @description Parameters for one agent iteration; aligned with
 * `WorkflowRalphIterationRunParams` in `@openthrottle/openthrottle-workflows`.
 */
/**
 * @description Aligns with {@link WorkflowRalphIterationStreamChunk} in
 * `@openthrottle/openthrottle-workflows`.
 */
export interface CursorWorkflowRalphIterationStreamChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

export interface CursorWorkflowRalphIterationRunParams {
  readonly agentPrompt: string;
  readonly iteration: number;
  readonly model: string | undefined;
  /**
   * @description Per-iteration hook (e.g. from `createWorkflowRalphOrchestrator` deps). Merged with
   * factory `CreateCursorWorkflowRalphIterationRunnerOptions.onChunk`.
   */
  readonly onChunk?: (
    chunk: CursorWorkflowRalphIterationStreamChunk,
  ) => void | Promise<void>;
  readonly runner: RalphExecutionBackendId;
  readonly signal: AbortSignal | undefined;
  readonly timeoutMs: number | undefined;
}

/**
 * @description Optional hook for forwarding each stdout/stderr chunk (e.g. OpenThrottle
 * `append_plan_output`). Does not change the orchestrator contract: {@link runIterationAsync}
 * still resolves the full combined string.
 */
export type CursorWorkflowRalphAppendPlanOutputChunk = (input: {
  readonly iteration: number;
  readonly stream: 'stdout' | 'stderr';
  readonly text: string;
}) => void | Promise<void>;

export interface CreateCursorWorkflowRalphIterationRunnerOptions {
  /** @description Forwarded to {@link runIterationAsync} `onChunk`. */
  readonly onChunk?: (chunk: CursorAgentChunk) => void | Promise<void>;
  /**
   * @description Optional per-chunk side effect (e.g. MCP `append_plan_output`). Invoked alongside
   * `onChunk` when both are set.
   */
  readonly appendPlanOutput?: CursorWorkflowRalphAppendPlanOutputChunk;
}

/**
 * @description Injected runner for `createWorkflowRalphOrchestrator`: same shape as
 * `WorkflowRalphIterationRunner` in `@openthrottle/openthrottle-workflows`.
 */
export interface CursorWorkflowRalphIterationRunner {
  readonly run: (
    params: CursorWorkflowRalphIterationRunParams,
  ) => Promise<string>;
}

/**
 * @description Returns a Cursor-backed iteration runner that delegates to {@link runIterationAsync}.
 * Pass optional hooks for streaming logs or plan output without importing orchestrator internals.
 */
export const createCursorWorkflowRalphIterationRunner = (
  options?: CreateCursorWorkflowRalphIterationRunnerOptions,
): CursorWorkflowRalphIterationRunner => ({
  run: async (
    params: CursorWorkflowRalphIterationRunParams,
  ): Promise<string> => {
    const { appendPlanOutput, onChunk: factoryOnChunk } = options ?? {};
    const paramsOnChunk = params.onChunk;
    const hasHooks =
      factoryOnChunk !== undefined ||
      appendPlanOutput !== undefined ||
      paramsOnChunk !== undefined;

    const mergedOnChunk = !hasHooks
      ? undefined
      : (chunk: CursorAgentChunk): void => {
          if (factoryOnChunk !== undefined) {
            void Promise.resolve(factoryOnChunk(chunk));
          }

          if (paramsOnChunk !== undefined) {
            void Promise.resolve(
              paramsOnChunk({
                data: chunk.data,
                stream: chunk.stream,
              }),
            );
          }

          if (appendPlanOutput !== undefined) {
            void Promise.resolve(
              appendPlanOutput({
                iteration: params.iteration,
                stream: chunk.stream,
                text: chunk.data,
              }),
            );
          }
        };

    return runIterationAsync({
      agentPrompt: params.agentPrompt,
      backend: params.runner,
      iteration: params.iteration,
      model: params.model,
      onChunk: mergedOnChunk,
      signal: params.signal,
      timeoutMs: params.timeoutMs,
    });
  },
});
