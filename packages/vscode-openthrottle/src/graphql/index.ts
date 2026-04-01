/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL" in env (e.g. http://localhost:6021).
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { getGraphQLUrl, parseDateTimeInResponse } from './utils.js';

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
}

/**
 * @description Execute a GraphQL operation against openthrottle-server. Use with typed documents from
 * @openthrottle/react-router-codegen for type-safe results.
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

  const res = await fetch(url, {
    body,
    headers,
    method: 'POST',
  });

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as GraphqlResponse<TData>;
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

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return parseDateTimeInResponse(json.data) as TData;
}

/**
 * @description Options for executeGraphqlAtUrl (e.g. auth token for Bearer header).
 */
export interface ExecuteGraphqlAtUrlOptions {
  /** When set, sent as Authorization: Bearer <token>. Omit for unauthenticated requests. */
  readonly token?: string | undefined;
}

/**
 * @description Execute a GraphQL operation at a given URL with optional Bearer token.
 * Use from runtimes (e.g. VS Code extension) that have their own base URL and token source.
 * @param url - Full GraphQL endpoint URL (e.g. https://example.com/graphql).
 * @param document - Typed document from codegen.
 * @param variables - Optional variables.
 * @param options - Optional token for Authorization: Bearer.
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
    ...(options?.token != null && options.token !== ''
      ? { Authorization: `Bearer ${options.token}` }
      : {}),
  };

  const res = await fetch(url, {
    body,
    headers,
    method: 'POST',
  });

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as GraphqlResponse<TData>;
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

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return parseDateTimeInResponse(json.data) as TData;
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
): Promise<TData> {
  const isTokenNull = token == null;
  const options = !isTokenNull
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined;

  return executeGraphql(document, variables, options);
}
