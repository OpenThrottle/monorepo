/**
 * @description GraphQL client for the VS Code extension. Uses a caller-supplied URL and optional Bearer token.
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { parseDateTimeInResponse } from './utils.ts';

interface ExecuteGraphqlAtUrlOptions {
  /** When set, sent as Authorization: Bearer <token>. Omit for unauthenticated requests. */
  readonly token?: string | undefined;
}

/**
 * @description Execute a GraphQL operation at a given URL with optional Bearer token.
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

  const json = (await res.json()) as {
    readonly data?: TData;
    readonly errors?: ReadonlyArray<{ readonly message: string }>;
  };

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

  return parseDateTimeInResponse(json.data) as TData;
}
