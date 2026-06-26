/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL_INTERNAL" in env (e.g. http://localhost:6021).
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import {
  buildTimeoutSignal,
  getGraphQLToken,
  getGraphQLUrl,
  parseDateTimeInResponse,
  parseGraphqlResponseBody,
  rethrowAsTimeoutIfAborted,
} from './utils.js';

/**
 * @description Standard GraphQL response shape from openthrottle-server.
 */
export interface GraphqlResponseV2<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<{
    readonly message: string;
    readonly path?: ReadonlyArray<string | number>;
  }>;
}

/**
 * @description Optional options for {@link executeGraphqlV2} (URL override, auth, extra headers).
 */
export interface ExecuteGraphqlOptionsV2 {
  /**
   * @description Extra headers merged after `Content-Type` and before Bearer `token` (token wins
   * over any `Authorization` here).
   */
  readonly headers?: Readonly<Record<string, string>> | undefined;
  /**
   * @description Optional caller `AbortSignal` forwarded to `fetch`. Combined
   * with the timeout signal (the request aborts when either fires).
   */
  readonly signal?: AbortSignal | undefined;
  /**
   * @description Per-request timeout in milliseconds, enforced via
   * `AbortSignal.timeout`. Defaults to {@link DEFAULT_GRAPHQL_TIMEOUT_MS}.
   * Pass `0` or a negative value to disable the timeout. On timeout the call
   * rejects with an `Error` whose message starts with
   * {@link GRAPHQL_TIMEOUT_ERROR_PREFIX}.
   */
  readonly timeoutMs?: number | undefined;
  readonly token?: string | undefined;
  readonly url?: string | undefined;
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
export async function executeGraphqlV2<
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: ExecuteGraphqlOptionsV2,
): Promise<TData> {
  const url = options?.url ?? getGraphQLUrl();
  const token = options?.token ?? getGraphQLToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };

  if (token != null && token !== '') {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = JSON.stringify({
    query: print(document),
    variables: variables ?? undefined,
  });

  let res: Response;

  try {
    res = await fetch(url, {
      body,
      headers,
      method: 'POST',
      signal: buildTimeoutSignal(options?.timeoutMs, options?.signal),
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
