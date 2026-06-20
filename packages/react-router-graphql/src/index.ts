/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL" in env (e.g. http://localhost:6021).
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  executeGraphql,
  executeGraphqlWithAuth as executeGraphqlWithAuthNodeJS,
} from '@openthrottle/nodejs-graphql';
import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';

/**
 * @description HTTP status codes that indicate an authentication/authorization
 * failure (expired or missing credentials). Used to detect when a caller should
 * redirect to login rather than treat the failure as a generic/network error.
 */
const AUTH_HTTP_STATUSES: ReadonlyArray<number> = [401, 403];

/**
 * @description Typed error thrown by {@link executeGraphqlWithAuth} when the
 * underlying request fails with an auth-related HTTP status (401/403). Consumers
 * can `instanceof`-check this to distinguish auth expiry from network/server
 * errors and redirect to login. Replaces the old (never-true) string match on a
 * bare `'Unauthorized'` message that the wrapped client never throws.
 *
 * @publicApi
 */
export class GraphqlAuthError extends Error {
  /** @description The HTTP status that triggered this error (e.g. 401, 403). */
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GraphqlAuthError';
    this.httpStatus = httpStatus;
  }
}

/**
 * @description Extract the HTTP status from a {@link executeGraphql} error
 * message of the form `openthrottle-server GraphQL error <status>: <msg>`
 * (see `@openthrottle/nodejs-graphql`). Returns `undefined` for any other
 * message shape (e.g. `GraphQL errors: ...` or a network failure).
 */
function extractHttpStatus(message: string): number | undefined {
  const match = /^openthrottle-server GraphQL error (\d+):/.exec(message);

  if (match == null) {
    return undefined;
  }

  const status = Number.parseInt(match[1] ?? '', 10);

  return Number.isNaN(status) ? undefined : status;
}

/**
 * @description Inspect a thrown error and, when it carries an auth-related HTTP
 * status (401/403), return a {@link GraphqlAuthError}; otherwise return the
 * original error unchanged so callers see the same failure they always have.
 */
function toAuthErrorOrSelf(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  const httpStatus = extractHttpStatus(error.message);

  if (httpStatus === undefined || !AUTH_HTTP_STATUSES.includes(httpStatus)) {
    return error;
  }

  return new GraphqlAuthError(error.message, httpStatus, { cause: error });
}

/**
 * @description Runs executeGraphql with Authorization: Bearer <token> when
 * the request has an auth cookie. Use in loaders/actions that have access to the request.
 *
 * On an auth-related failure (HTTP 401/403) the rejection is a
 * {@link GraphqlAuthError} (with `httpStatus`) so callers can `instanceof`-check
 * it and redirect to login; all other failures reject with the original error.
 */
export async function executeGraphqlWithAuth<
  TData,
  TVariables extends Record<string, unknown>,
>(
  request: Request,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  if (!token) {
    try {
      return await executeGraphql(document, variables);
    } catch (error) {
      throw toAuthErrorOrSelf(error);
    }
  }

  try {
    return await executeGraphqlWithAuthNodeJS(token, document, variables);
  } catch (error) {
    throw toAuthErrorOrSelf(error);
  }
}

export { executeGraphql };

export * from './hooks/createGraphqlWsClient';
export * from './hooks/useSubscription';
