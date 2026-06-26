/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL_INTERNAL" in env (e.g. http://localhost:6021).
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import {
  buildTimeoutSignal,
  getGraphQLUrl,
  parseDateTimeInResponse,
  parseGraphqlResponseBody,
  rethrowAsTimeoutIfAborted,
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
  GraphqlV2RetryOn,
  GraphqlV2RetryOptions,
} from './graphql-v2.js';
export { defaultRetryOn, executeGraphql_v2 } from './graphql-v2.js';
export { executeGraphqlV2 } from './index-v2.js';
export { getGraphQLUrl, parseDateTimeInResponse } from './utils.js';
export type { ExecuteGraphqlOptionsV2, GraphqlResponseV2 } from './index-v2.js';
export {
  DEFAULT_GRAPHQL_TIMEOUT_MS,
  GRAPHQL_TIMEOUT_ERROR_PREFIX,
} from './utils.js';

/**
 * @description Standard GraphQL response shape from openthrottle-server.
 * @publicApi
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
 * @publicApi
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
 * @publicApi
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

  // `as TData` is sound here despite the repo's no-`as` convention: this is the
  // post-validation success path (HTTP OK, no GraphQL errors, non-null `data`),
  // and `parseDateTimeInResponse` returns `unknown` only because the recursive
  // Date-walk erases the type. The codegen `TypedDocumentNode` guarantees the
  // shape. Do not "tighten" this away — there is no runtime type to narrow to.
  return parseDateTimeInResponse(json.data) as TData;
}

/**
 * @description Options for executeGraphqlAtUrl (e.g. auth token for Bearer header).
 * @publicApi
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
 * @publicApi
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

  // `as TData` is sound here: post-validation success path; the cast only
  // re-attaches the codegen-guaranteed shape that `parseDateTimeInResponse`'s
  // `unknown` return erases. See the note on the cast in `executeGraphql`.
  return parseDateTimeInResponse(json.data) as TData;
}

/**
 * @description Options for {@link executeGraphqlWithAuth}.
 * @publicApi
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
 * @publicApi
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
