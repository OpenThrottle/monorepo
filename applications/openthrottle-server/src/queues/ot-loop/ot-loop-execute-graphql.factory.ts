import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';

import type {
  OtLoopExecuteGraphql,
  PlanRunWorkerGraphqlAuth,
} from './ot-loop.types.ts';

/**
 * @description Builds the worker-scoped GraphQL executor: the worker credentials are the defaults
 * under each call's own options, and headers are deep-merged so a per-call header (for example
 * `X-OT-Session-Id`) is added on top of any baked worker headers instead of replacing them.
 */
export const createOtLoopExecuteGraphql = (
  executeGraphqlV2: OtLoopExecuteGraphql,
  workerGraphqlAuth: PlanRunWorkerGraphqlAuth,
): OtLoopExecuteGraphql => {
  return async <TData, TVariables extends Record<string, unknown>>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
    overrideOptions?: ExecuteGraphqlOptionsV2,
  ): Promise<TData> => {
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
  };
};
