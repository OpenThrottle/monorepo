import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { WorkflowGraphqlConfig } from './workflow-graphql-config.js';
import {
  executeWorkflowGraphql,
  type WorkflowGraphqlResult,
} from './execute.js';

/**
 * @description Single integration surface for workflow GraphQL: holds {@link WorkflowGraphqlConfig} and exposes {@link WorkflowGraphqlClient.execute}.
 */
export interface WorkflowGraphqlClient {
  readonly config: WorkflowGraphqlConfig;
  execute<TData, TVariables extends Record<string, unknown>>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
  ): Promise<WorkflowGraphqlResult<TData>>;
}

/**
 * @description Creates a {@link WorkflowGraphqlClient} backed by codegen documents and shared config (mcp-developer-style: one client, typed operations).
 */
export function createWorkflowGraphqlClient(
  config: WorkflowGraphqlConfig,
): WorkflowGraphqlClient {
  return {
    config,
    execute: <TData, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TData, TVariables>,
      variables?: TVariables,
    ) => executeWorkflowGraphql(config, document, variables),
  };
}
