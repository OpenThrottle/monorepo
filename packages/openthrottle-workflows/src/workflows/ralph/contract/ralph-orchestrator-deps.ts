import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type { WorkflowRunner } from './flow-context.js';

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
 * @description One agent iteration (layer-2), aligned with `tools/workflows` `RunIterationConfig` /
 * `runIterationAsync`: environment-specific runner returns combined stdout/stderr text.
 */
export interface WorkflowRalphIterationRunParams {
  readonly agentPrompt: string;
  readonly iteration: number;
  readonly model: string | undefined;
  readonly runner: WorkflowRunner;
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
}
