import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';

/**
 * @description Explicit GraphQL endpoint and Bearer credentials for worker/BullMQ runs.
 * Workers have no HTTP session; the application must supply this (for example from env or a secret store).
 * Same shape as {@link ExecuteGraphqlOptionsV2}, merged as defaults for each operation.
 */
export type AgenticWorkflowWorkerGraphqlAuth = ExecuteGraphqlOptionsV2;

/**
 * @description Injectable executor aligned with {@link executeGraphqlV2} from `@openthrottle/nodejs-graphql`.
 * Implementations must use codegen `TypedDocumentNode` operations only, not ad-hoc HTTP.
 */
export type AgenticWorkflowExecuteGraphqlV2 = <
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptionsV2,
) => Promise<TData>;

/**
 * @description Nest DI token for {@link AgenticWorkflowWorkerGraphqlAuth}.
 */
export const AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH = Symbol(
  'AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH',
);

/**
 * @description Nest DI token for {@link AgenticWorkflowExecuteGraphqlV2}.
 */
export const AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2 = Symbol(
  'AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2',
);
