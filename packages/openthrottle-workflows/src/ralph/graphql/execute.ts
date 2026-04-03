import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphql } from '@openthrottle/nodejs-graphql';
import type { WorkflowGraphqlConfig } from './workflow-graphql-config.js';
import type { WorkflowGraphqlError } from './errors.js';
import { mapUnknownToWorkflowGraphqlError } from './errors.js';
import { postOpenthrottleGraphql } from './post-graphql.js';

/**
 * @description Successful GraphQL data payload from {@link executeWorkflowGraphql}.
 */
export interface WorkflowGraphqlOkResult<TData> {
  readonly data: TData;
  readonly ok: true;
}

/**
 * @description Failed GraphQL call with structured {@link WorkflowGraphqlError}.
 */
export interface WorkflowGraphqlErrResult {
  readonly error: WorkflowGraphqlError;
  readonly ok: false;
}

/**
 * @description Result of {@link executeWorkflowGraphql} (discriminated union; no thrown errors from transport).
 */
export type WorkflowGraphqlResult<TData> =
  | WorkflowGraphqlErrResult
  | WorkflowGraphqlOkResult<TData>;

/**
 * @description Merges Bearer and optional {@link WorkflowGraphqlConfig.additionalHeaders} for `@openthrottle/nodejs-graphql` `executeGraphql` options.
 */
export function buildWorkflowGraphqlHeaders(
  config: WorkflowGraphqlConfig,
): Record<string, string> {
  const out: Record<string, string> = {
    ...config.additionalHeaders,
  };

  const token = config.token?.trim();

  if (token != null && token !== '') {
    out.Authorization = `Bearer ${token}`;
  }

  return out;
}

/**
 * @description Executes a codegen TypedDocumentNode against OpenThrottle GraphQL and returns a result (no throw on HTTP/GraphQL errors). Uses env-based URL when {@link WorkflowGraphqlConfig.graphqlUrl} is unset (see `API_URL_INTERNAL` in `@openthrottle/nodejs-graphql`).
 */
export async function executeWorkflowGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  config: WorkflowGraphqlConfig,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<WorkflowGraphqlResult<TData>> {
  try {
    const headers = buildWorkflowGraphqlHeaders(config);
    const url = config.graphqlUrl?.trim();

    const data =
      url != null && url !== ''
        ? await postOpenthrottleGraphql(url, document, variables, headers)
        : await executeGraphql(document, variables, { headers });

    return { data, ok: true };
  } catch (thrown) {
    return {
      error: mapUnknownToWorkflowGraphqlError(thrown),
      ok: false,
    };
  }
}
