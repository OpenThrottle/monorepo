/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL_INTERNAL" in env (e.g. http://localhost:6021).
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  DEFAULT_GRAPHQL_TIMEOUT_MS,
  GRAPHQL_TIMEOUT_ERROR_PREFIX,
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
 * @description Type guard that reports whether a thrown error is an
 * authentication/authorization failure (HTTP 401/403) raised by
 * {@link executeGraphqlWithAuth}. Use this single helper in loaders/actions to
 * decide whether to redirect to login, instead of brittle `message.includes`
 * string-scraping that breaks when the backend rewords an error or returns the
 * status in a GraphQL-errors body rather than the HTTP status line.
 *
 * @publicApi
 */
export function isAuthError(error: unknown): error is GraphqlAuthError {
  return error instanceof GraphqlAuthError;
}

/**
 * @description Typed error thrown by {@link executeGraphqlWithAuth} when the
 * underlying request exceeds its timeout (`AbortSignal.timeout`). Distinguished
 * from generic network failures so loaders/actions can render a "request timed
 * out" state (e.g. 504) instead of treating an unbounded stall as a normal
 * error. Without this, a hung openthrottle-server connection would hold the SSR
 * request open with no upper bound.
 *
 * @publicApi
 */
export class GraphqlTimeoutError extends Error {
  /** @description The timeout (milliseconds) that elapsed before aborting. */
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GraphqlTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * @description Type guard that reports whether a thrown error is a request
 * timeout raised by {@link executeGraphqlWithAuth}. Use in loaders/actions to
 * render a distinct timeout state rather than a generic error.
 *
 * @publicApi
 */
export function isTimeoutError(error: unknown): error is GraphqlTimeoutError {
  return error instanceof GraphqlTimeoutError;
}

/**
 * @description Default per-request timeout (milliseconds) applied by
 * {@link executeGraphqlWithAuth} when a caller does not pass `timeoutMs`.
 * Mirrors `@openthrottle/nodejs-graphql`'s default so the loader-facing API
 * has a single sane bound (15s).
 *
 * @publicApi
 */
export const DEFAULT_LOADER_TIMEOUT_MS = DEFAULT_GRAPHQL_TIMEOUT_MS;

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
 * @description Inspect a thrown error and classify it into a typed failure when
 * recognizable: a {@link GraphqlTimeoutError} for the timeout marker raised by
 * `@openthrottle/nodejs-graphql`, or a {@link GraphqlAuthError} for an
 * auth-related HTTP status (401/403). Any other error is returned unchanged so
 * callers see the same failure they always have.
 */
function classifyError(error: unknown, timeoutMs: number): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  if (error.message.startsWith(GRAPHQL_TIMEOUT_ERROR_PREFIX)) {
    return new GraphqlTimeoutError(error.message, timeoutMs, { cause: error });
  }

  const httpStatus = extractHttpStatus(error.message);

  if (httpStatus === undefined || !AUTH_HTTP_STATUSES.includes(httpStatus)) {
    return error;
  }

  return new GraphqlAuthError(error.message, httpStatus, { cause: error });
}

/**
 * @description Options for {@link executeGraphqlWithAuth}.
 *
 * @publicApi
 */
export interface ExecuteGraphqlWithAuthOptions {
  /**
   * @description Upper bound (milliseconds) on the underlying request, enforced
   * via `AbortSignal.timeout` so a stalled openthrottle-server connection cannot
   * hold an SSR loader/action open indefinitely. Defaults to
   * {@link DEFAULT_LOADER_TIMEOUT_MS} (15s). Pass `0` or a negative value to
   * disable the timeout. On timeout the call rejects with a
   * {@link GraphqlTimeoutError} (check via {@link isTimeoutError}).
   */
  readonly timeoutMs?: number | undefined;
}

/**
 * @description Runs executeGraphql with Authorization: Bearer <token> when
 * the request has an auth cookie. Use in loaders/actions that have access to the request.
 *
 * The underlying request is bounded by a timeout (default
 * {@link DEFAULT_LOADER_TIMEOUT_MS}, configurable via `options.timeoutMs`) so a
 * stalled connection cannot hang the loader indefinitely.
 *
 * On a timeout the rejection is a {@link GraphqlTimeoutError} (check via
 * {@link isTimeoutError}); on an auth-related failure (HTTP 401/403) it is a
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
  options?: ExecuteGraphqlWithAuthOptions,
): Promise<TData> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LOADER_TIMEOUT_MS;

  if (!token) {
    try {
      return await executeGraphql(document, variables, { timeoutMs });
    } catch (error) {
      throw classifyError(error, timeoutMs);
    }
  }

  try {
    return await executeGraphqlWithAuthNodeJS(token, document, variables, {
      timeoutMs,
    });
  } catch (error) {
    throw classifyError(error, timeoutMs);
  }
}

/**
 * @description Re-export of the unauthenticated v1 primitive from
 * `@openthrottle/nodejs-graphql`. This is the sanctioned import surface per the
 * repo "no deep package imports" convention — consumers must not reach into
 * `@openthrottle/nodejs-graphql` directly. Intentionally exposed for the few
 * call sites that genuinely need an unauthenticated request; auth-aware loaders
 * should prefer {@link executeGraphqlWithAuth} instead.
 *
 * Transport note: a single `fetch` attempt is made with no retry. This is a
 * deliberate decision for SSR loaders/actions — a transient transport failure
 * surfaces immediately and the user retries by reloading, rather than the
 * loader silently stalling through retry/backoff during the SSR request.
 *
 * @publicApi
 */
export { executeGraphql };

export * from './hooks/createGraphqlWsClient';
export * from './hooks/executeWsMutation';
export * from './hooks/useSubscription';
