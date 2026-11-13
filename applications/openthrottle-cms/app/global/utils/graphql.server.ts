import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphql } from '@openthrottle/react-router-graphql';

/**
 * @description Upper bound (milliseconds) on a public GraphQL request from a loader, so a page
 * fails fast into its error state instead of holding the SSR response open.
 */
const PUBLIC_GRAPHQL_TIMEOUT_MS = 8_000;

/**
 * @description Server-side, unauthenticated GraphQL request against openthrottle-server
 * (`API_URL_INTERNAL`), for operations the server marks `@Public()` such as `cmsLayout`. Route
 * loaders only: the `.server.ts` suffix keeps it out of the browser bundle.
 *
 * @returns The `data` portion of the response. Rejects on transport failure, GraphQL errors, a
 * non-OK status, or after {@link PUBLIC_GRAPHQL_TIMEOUT_MS}.
 */
export async function fetchPublicGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  return executeGraphql(document, variables, {
    timeoutMs: PUBLIC_GRAPHQL_TIMEOUT_MS,
  });
}
