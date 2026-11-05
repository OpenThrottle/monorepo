import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  AgenticWorkflowExecuteGraphqlV2,
  AgenticWorkflowWorkerGraphqlAuth,
} from '@openthrottle/nestjs-agentic-workflow';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import type { WorkflowRalphOrchestratorDeps } from '@openthrottle/openthrottle-agentic-ralph';
import { createDefaultWorkflowRalphCommandRunner } from '@openthrottle/openthrottle-agentic-ralph';
import { createCursorWorkflowRalphIterationRunner } from '@tools/workflows';

/**
 * @description Builds {@link WorkflowRalphOrchestratorDeps} for the OpenThrottle server by merging injected
 * worker GraphQL defaults with each operation and registering the Cursor iteration runner plus the
 * host `git`/`gh` command runner for plan-end push/PR finalize.
 */
export const createAgenticRalphOrchestratorDeps = (
  executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2,
  workerGraphqlAuth: AgenticWorkflowWorkerGraphqlAuth,
): WorkflowRalphOrchestratorDeps => {
  return {
    executeGraphqlV2: async <TData, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TData, TVariables>,
      variables?: TVariables,
      overrideOptions?: ExecuteGraphqlOptionsV2,
    ): Promise<TData> => {
      // Deep-merge headers so a per-call header (e.g. X-OT-Session-Id) is added on top of any baked
      // worker headers rather than clobbering them under the shallow spread below.
      const bakedHeaders = workerGraphqlAuth.headers;
      const callHeaders = overrideOptions?.headers;
      const hasHeaders = bakedHeaders != null || callHeaders != null;
      const combinedHeaders = { ...bakedHeaders, ...callHeaders };
      const mergedHeaders = hasHeaders ? combinedHeaders : undefined;

      return executeGraphqlV2(document, variables, {
        ...workerGraphqlAuth,
        ...overrideOptions,
        ...(mergedHeaders != null ? { headers: mergedHeaders } : {}),
      });
    },
    iterationRunner: createCursorWorkflowRalphIterationRunner(),
    runCommand: createDefaultWorkflowRalphCommandRunner(),
  };
};
