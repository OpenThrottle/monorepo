/**
 * @description Factory for a {@link WorkflowRalphIterationRunner}-compatible iteration runner
 * (see `@openthrottle/openthrottle-agentic-ralph` `WorkflowRalphOrchestratorDeps.iterationRunner`).
 * Wraps {@link runIterationAsync} so hosts can attach streaming side effects without duplicating field mapping.
 *
 * Backend selection is **per plan run**: pass {@link CursorWorkflowRalphIterationRunParams.runner}
 * (`cursor` | `claude`). Dispatch is implemented in {@link runIterationAsync}; both backends share the same
 * injected prompt string and streaming/timeout behavior.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type {
  DriverReasoningEffort,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';

import type { CursorAgentChunk } from '../bin/run-iteration';
import { runIterationAsync } from '../bin/run-iteration';

/**
 * @description Parameters for one agent iteration; aligned with
 * `WorkflowRalphIterationRunParams` in `@openthrottle/openthrottle-agentic-ralph`.
 */
/**
 * @description Aligns with {@link WorkflowRalphIterationStreamChunk} in
 * `@openthrottle/openthrottle-agentic-ralph`.
 */
export interface CursorWorkflowRalphIterationStreamChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

export interface CursorWorkflowRalphIterationRunParams {
  readonly agentPrompt: string;
  /**
   * @description Agent subprocess cwd (foreign `workingDirectory` on orchestrator path).
   */
  readonly cwd?: string;
  /**
   * @description Reasoning effort forwarded to {@link runIterationAsync}; each backend maps it to its
   * own flag or ignores it (see `DriverInvocationConfig.effort`).
   */
  readonly effort?: DriverReasoningEffort;
  /** @description Extra env for the agent subprocess, merged over `process.env`. */
  readonly env?: Readonly<Record<string, string>>;
  readonly iteration: number;
  readonly model: string | undefined;
  /**
   * @description Per-iteration hook (e.g. from `createWorkflowRalphOrchestrator` deps). Merged with
   * factory `CreateCursorWorkflowRalphIterationRunnerOptions.onChunk`.
   */
  readonly onChunk?: (
    chunk: CursorWorkflowRalphIterationStreamChunk,
  ) => void | Promise<void>;
  /**
   * @description Per-iteration hook fired when the iteration closes normally having hit a
   * subscription usage limit. Merged with factory
   * `CreateCursorWorkflowRalphIterationRunnerOptions.onUsageLimit`. The returned string is unchanged.
   */
  readonly onUsageLimit?: (usageLimit: UsageLimit) => void;
  readonly runner: WorkflowConfigRunner;
  readonly signal: AbortSignal | undefined;
  readonly skipWorktreeSetup?: boolean;
  readonly timeoutMs: number | undefined;
  readonly worktree?: string;
  readonly worktreeBase?: string;
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
  /**
   * @description Optional per-chunk side effect (e.g. MCP `append_plan_output`). Invoked alongside
   * `onChunk` when both are set.
   */
  readonly appendPlanOutput?: CursorWorkflowRalphAppendPlanOutputChunk;
  /** @description Forwarded to {@link runIterationAsync} `onChunk`. */
  readonly onChunk?: (chunk: CursorAgentChunk) => void | Promise<void>;
  /** @description Forwarded to {@link runIterationAsync} `onUsageLimit`; invoked alongside the per-run hook. */
  readonly onUsageLimit?: (usageLimit: UsageLimit) => void;
}

/**
 * @description Injected runner for `createWorkflowRalphOrchestrator`: same shape as
 * `WorkflowRalphIterationRunner` in `@openthrottle/openthrottle-agentic-ralph`.
 */
export interface CursorWorkflowRalphIterationRunner {
  readonly run: (
    params: CursorWorkflowRalphIterationRunParams,
  ) => Promise<string>;
}

/**
 * @description Returns an iteration runner that delegates to {@link runIterationAsync} (any
 * {@link RalphExecutionBackendId} via `params.runner`). Pass optional hooks for streaming logs or
 * plan output without importing orchestrator internals.
 */
export const createCursorWorkflowRalphIterationRunner = (
  options?: CreateCursorWorkflowRalphIterationRunnerOptions,
): CursorWorkflowRalphIterationRunner => ({
  run: async (
    params: CursorWorkflowRalphIterationRunParams,
  ): Promise<string> => {
    const {
      appendPlanOutput,
      onChunk: factoryOnChunk,
      onUsageLimit: factoryOnUsageLimit,
    } = options ?? {};
    const paramsOnUsageLimit = params.onUsageLimit;
    const hasLimitHooks =
      factoryOnUsageLimit !== undefined || paramsOnUsageLimit !== undefined;
    const notifyUsageLimit = (usageLimit: UsageLimit): void => {
      factoryOnUsageLimit?.(usageLimit);
      paramsOnUsageLimit?.(usageLimit);
    };
    const mergedOnUsageLimit = hasLimitHooks ? notifyUsageLimit : undefined;
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
      cwd: params.cwd,
      effort: params.effort,
      env: params.env,
      iteration: params.iteration,
      model: params.model,
      onChunk: mergedOnChunk,
      onUsageLimit: mergedOnUsageLimit,
      signal: params.signal,
      skipWorktreeSetup: params.skipWorktreeSetup,
      timeoutMs: params.timeoutMs,
      worktree: params.worktree,
      worktreeBase: params.worktreeBase,
    });
  },
});
