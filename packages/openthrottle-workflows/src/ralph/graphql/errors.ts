import type { WorkflowError } from '../contract/workflow-error.js';

/**
 * @description Discriminated error codes for workflow GraphQL transport and response handling.
 */
export type WorkflowGraphqlErrorCode =
  | 'WORKFLOW_GRAPHQL_GRAPHQL_ERRORS'
  | 'WORKFLOW_GRAPHQL_HTTP'
  | 'WORKFLOW_GRAPHQL_MISSING_DATA'
  | 'WORKFLOW_GRAPHQL_UNKNOWN';

/**
 * @description Structured failure for workflow GraphQL calls; maps thrown errors and GraphQL error payloads.
 */
export interface WorkflowGraphqlError extends WorkflowError {
  readonly code: WorkflowGraphqlErrorCode;
  readonly graphqlPath?: ReadonlyArray<string | number>;
  readonly httpStatus?: number;
}

/**
 * @description Maps an unknown thrown value to {@link WorkflowGraphqlError} for {@link executeWorkflowGraphql} err results.
 */
export function mapUnknownToWorkflowGraphqlError(
  thrown: unknown,
): WorkflowGraphqlError {
  if (thrown instanceof Error) {
    const message = thrown.message;
    const code = inferCodeFromMessage(message);

    return {
      cause: thrown,
      code,
      graphqlPath: undefined,
      httpStatus: inferHttpStatusFromMessage(message),
      message,
    };
  }

  return {
    cause: undefined,
    code: 'WORKFLOW_GRAPHQL_UNKNOWN',
    graphqlPath: undefined,
    httpStatus: undefined,
    message: String(thrown),
  };
}

function inferCodeFromMessage(message: string): WorkflowGraphqlErrorCode {
  if (message.includes('GraphQL response missing data')) {
    return 'WORKFLOW_GRAPHQL_MISSING_DATA';
  }

  if (message.startsWith('GraphQL errors:')) {
    return 'WORKFLOW_GRAPHQL_GRAPHQL_ERRORS';
  }

  if (/openthrottle-server GraphQL error \d+:/.test(message)) {
    return 'WORKFLOW_GRAPHQL_HTTP';
  }

  return 'WORKFLOW_GRAPHQL_UNKNOWN';
}

function inferHttpStatusFromMessage(message: string): number | undefined {
  const match = /openthrottle-server GraphQL error (\d+):/.exec(message);
  if (match?.[1] == null) {
    return undefined;
  }

  const n = Number.parseInt(match[1], 10);

  return Number.isNaN(n) ? undefined : n;
}
