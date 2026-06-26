/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL_INTERNAL" in env (e.g. http://localhost:6021).
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import {
  getGraphQLUrl,
  parseDateTimeInResponse,
  parseGraphqlResponseBody,
} from './utils.js';

export type {
  ExecuteGraphqlV2,
  GraphqlV2ErrResult,
  GraphqlV2ExecuteOptions,
  GraphqlV2Failure,
  GraphqlV2FailureContext,
  GraphqlV2FailureKind,
  GraphqlV2GraphqlErrorItem,
  GraphqlV2MapFailure,
  GraphqlV2OkResult,
  GraphqlV2ResponsePayload,
  GraphqlV2Result,
} from './graphql-v2.js';
export { executeGraphql_v2 } from './graphql-v2.js';
export { executeGraphqlV2 } from './index-v2.js';
export { getGraphQLUrl, parseDateTimeInResponse } from './utils.js';
export type { ExecuteGraphqlOptionsV2, GraphqlResponseV2 } from './index-v2.js';

/**
 * @description Default per-request timeout (milliseconds) applied to the
 * underlying `fetch` when a caller does not pass an explicit `timeoutMs`.
 * Bounds an SSR loader/action so a stalled openthrottle-server connection
 * cannot hold the request open indefinitely.
 */
export const DEFAULT_GRAPHQL_TIMEOUT_MS = 15_000;

/**
 * @description Marker prefix on the message of the `Error` thrown when a
 * request exceeds its timeout. Consumers (e.g. `@openthrottle/react-router-graphql`)
 * match on this to classify the failure as a distinct timeout kind rather than a
 * generic network error.
 */
export const GRAPHQL_TIMEOUT_ERROR_PREFIX =
  'openthrottle-server GraphQL request timed out';

/**
 * @description Build the `AbortSignal` enforcing the per-request timeout.
 * `0` or a negative value disables the timeout (no signal). Defaults to
 * {@link DEFAULT_GRAPHQL_TIMEOUT_MS} when `timeoutMs` is `undefined`.
 */
function buildTimeoutSignal(
  timeoutMs: number | undefined,
): AbortSignal | undefined {
  const ms = timeoutMs ?? DEFAULT_GRAPHQL_TIMEOUT_MS;

  if (ms <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(ms);
}

/**
 * @description Wrap a thrown `fetch` rejection: when it is the abort raised by
 * our timeout signal (`TimeoutError`/`AbortError`), rethrow a recognizable
 * timeout `Error` (message prefixed with {@link GRAPHQL_TIMEOUT_ERROR_PREFIX});
 * otherwise rethrow the original error unchanged.
 */
function rethrowAsTimeoutIfAborted(
  error: unknown,
  timeoutMs: number | undefined,
): never {
  const ms = timeoutMs ?? DEFAULT_GRAPHQL_TIMEOUT_MS;

  if (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  ) {
    // Preserve the original abort as the cause via Object.assign rather than
    // the ES2022 two-arg `Error(message, { cause })` constructor: this package
    // is consumed source-first by ES2020 targets (e.g. @tools/workflows), whose
    // lib lacks the es2022.error overload.
    throw Object.assign(
      new Error(`${GRAPHQL_TIMEOUT_ERROR_PREFIX} after ${ms}ms`),
      { cause: error },
    );
  }

  throw error;
}

/**
 * @description Standard GraphQL response shape from openthrottle-server.
 */
export interface GraphqlResponse<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<{
    readonly message: string;
    readonly path?: ReadonlyArray<string | number>;
  }>;
}

/**
 * @description Optional options for executeGraphql (e.g. auth headers).
 */
export interface ExecuteGraphqlOptions {
  readonly headers?: Record<string, string>;
  /**
   * @description Per-request timeout in milliseconds, enforced via
   * `AbortSignal.timeout`. Defaults to {@link DEFAULT_GRAPHQL_TIMEOUT_MS}.
   * Pass `0` or a negative value to disable the timeout. On timeout the call
   * rejects with an `Error` whose message starts with
   * {@link GRAPHQL_TIMEOUT_ERROR_PREFIX}.
   */
  readonly timeoutMs?: number | undefined;
}

/**
 * @description Execute a GraphQL operation against openthrottle-server. Use
 * with typed documents from @openthrottle/react-router-codegen for type-safe results.
 *
 * @param document - Typed document (query or mutation) from codegen; result type is inferred.
 * @param variables - Optional variables object.
 * @param options - Optional headers (e.g. Authorization) to send with the request.
 *
 * @returns The `data` portion of the response; throws if the response has errors or non-OK status.
 */
export async function executeGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptions,
): Promise<TData> {
  const url = getGraphQLUrl();
  const body = JSON.stringify({
    query: print(document),
    variables: variables ?? undefined,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  let res: Response;

  try {
    res = await fetch(url, {
      body,
      headers,
      method: 'POST',
      signal: buildTimeoutSignal(options?.timeoutMs),
    });
  } catch (error) {
    rethrowAsTimeoutIfAborted(error, options?.timeoutMs);
  }

  const json = await parseGraphqlResponseBody(res);

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(
      `openthrottle-server GraphQL error ${res.status}: ${message}`,
    );
  }

  if (json.errors != null && json.errors.length > 0) {
    const first = json.errors[0];
    throw new Error(`GraphQL errors: ${first?.message ?? 'unknown'}`);
  }

  if (json.data == null) {
    throw new Error('GraphQL response missing data');
  }

  return parseDateTimeInResponse(json.data) as TData;
}

/**
 * @description Options for executeGraphqlAtUrl (e.g. auth token for Bearer header).
 */
export interface ExecuteGraphqlAtUrlOptions {
  /**
   * @description Extra headers merged after `Content-Type` (e.g. tracing). When
   * {@link token} is set, `Authorization: Bearer <token>` is applied after this map
   * so the token wins over any `Authorization` here.
   */
  readonly headers?: Record<string, string>;
  /**
   * @description Per-request timeout in milliseconds, enforced via
   * `AbortSignal.timeout`. Defaults to {@link DEFAULT_GRAPHQL_TIMEOUT_MS}.
   * Pass `0` or a negative value to disable the timeout. On timeout the call
   * rejects with an `Error` whose message starts with
   * {@link GRAPHQL_TIMEOUT_ERROR_PREFIX}.
   */
  readonly timeoutMs?: number | undefined;
  /** When set, sent as Authorization: Bearer <token>. Omit for unauthenticated requests. */
  readonly token?: string | undefined;
}

/**
 * @description Execute a GraphQL operation at a given URL with optional Bearer token.
 * Use from runtimes (e.g. VS Code extension) that have their own base URL and token source.
 *
 * @param url - Full GraphQL endpoint URL (e.g. https://example.com/graphql).
 * @param document - Typed document from codegen.
 * @param variables - Optional variables.
 * @param options - Optional token for Authorization: Bearer.
 *
 * @returns The `data` portion of the response; throws if errors or non-OK status.
 */
export async function executeGraphqlAtUrl<
  TData,
  TVariables extends Record<string, unknown>,
>(
  url: string,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlAtUrlOptions,
): Promise<TData> {
  const body = JSON.stringify({
    query: print(document),
    variables: variables ?? undefined,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
    ...(options?.token != null && options.token !== ''
      ? { Authorization: `Bearer ${options.token}` }
      : {}),
  };

  let res: Response;

  try {
    res = await fetch(url, {
      body,
      headers,
      method: 'POST',
      signal: buildTimeoutSignal(options?.timeoutMs),
    });
  } catch (error) {
    rethrowAsTimeoutIfAborted(error, options?.timeoutMs);
  }

  const json = await parseGraphqlResponseBody(res);

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(
      `openthrottle-server GraphQL error ${res.status}: ${message}`,
    );
  }

  if (json.errors != null && json.errors.length > 0) {
    const first = json.errors[0];
    throw new Error(`GraphQL errors: ${first?.message ?? 'unknown'}`);
  }

  if (json.data == null) {
    throw new Error('GraphQL response missing data');
  }

  return parseDateTimeInResponse(json.data) as TData;
}

/**
 * @description Options for {@link executeGraphqlWithAuth}.
 */
export interface ExecuteGraphqlWithAuthOptions {
  /**
   * @description Per-request timeout in milliseconds, forwarded to
   * {@link executeGraphql}. Defaults to {@link DEFAULT_GRAPHQL_TIMEOUT_MS}.
   * Pass `0` or a negative value to disable the timeout.
   */
  readonly timeoutMs?: number | undefined;
}

/**
 * @description Runs executeGraphql with Authorization: Bearer <token> when the request has an auth cookie. Use in loaders/actions that have access to the request.
 */
export async function executeGraphqlWithAuth<
  TData,
  TVariables extends Record<string, unknown>,
>(
  token: string,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlWithAuthOptions,
): Promise<TData> {
  const isTokenNull = !token || token == null;
  const executeOptions: ExecuteGraphqlOptions = {
    timeoutMs: options?.timeoutMs,
    ...(isTokenNull ? {} : { headers: { Authorization: `Bearer ${token}` } }),
  };

  return executeGraphql(document, variables, executeOptions);
}
