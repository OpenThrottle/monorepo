import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/**
 * @description Injectable GraphQL executor: same contract as `executeGraphqlV2` from
 * `@openthrottle/nodejs-graphql`. Orchestrator code must not perform ad-hoc HTTP; only call this with
 * codegen `TypedDocumentNode`s.
 */
export type WorkflowExecuteGraphqlV2 = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptionsV2,
) => Promise<TData>;

/**
 * @description One stdout/stderr fragment from an iteration runner; backend-agnostic (aligns with
 * `CursorAgentChunk` in `tools/workflows` `runIterationAsync`).
 */
export interface WorkflowRalphIterationStreamChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

/**
 * @description Optional streaming hook forwarded by {@link createWorkflowRalphOrchestrator} into each
 * `iterationRunner.run` call. The orchestrator still buffers full output for parsing; this is for side
 * effects only (logs, WebSocket, `append_plan_output`, etc.).
 */
export type WorkflowRalphIterationOnChunk = (
  chunk: WorkflowRalphIterationStreamChunk,
) => void | Promise<void>;

/**
 * @description One agent iteration (layer-2), aligned with `tools/workflows` `RunIterationConfig` /
 * `runIterationAsync`: environment-specific runner returns combined stdout/stderr text.
 */
export interface WorkflowRalphIterationRunParams {
  readonly agentPrompt: string;
  readonly iteration: number;
  readonly model: string | undefined;
  readonly onChunk?: WorkflowRalphIterationOnChunk;
  readonly runner: WorkflowConfigRunner;
  readonly signal: AbortSignal | undefined;
  readonly timeoutMs: number | undefined;
}

/**
 * @description Injected runner for the `iteration.run` pipeline step. Implementations live outside this
 * package (e.g. Cursor `cursor-agent` in `tools/workflows`).
 */
export interface WorkflowRalphIterationRunner {
  readonly run: (params: WorkflowRalphIterationRunParams) => Promise<string>;
}

/**
 * @description Dependencies for constructing a Ralph-shaped `WorkflowOrchestrator`: GraphQL I/O and
 * iteration execution. Pass `executeGraphqlV2` from `@openthrottle/nodejs-graphql` with options from
 * `buildWorkflowExecuteGraphqlV2Options` in `workflow-graphql.ts`, or a test double.
 */
export interface WorkflowRalphOrchestratorDeps {
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly iterationRunner: WorkflowRalphIterationRunner;
  /**
   * @description When set, passed through to every {@link WorkflowRalphIterationRunner.run} call as
   * {@link WorkflowRalphIterationRunParams.onChunk} so embedders can stream without importing runner
   * internals.
   */
  readonly onChunk?: WorkflowRalphIterationOnChunk;
}
