import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  executeGraphql,
  executeGraphqlWithAuth,
} from '@openthrottle/react-router-graphql';

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

/**
 * @description Server-side GraphQL request as the signed-in user: forwards the auth cookie on
 * `request` as a bearer token (unauthenticated when there is none). For cms mutations, which
 * `CmsWriteGuard` refuses without a user allowed `cms:write`. Route actions only.
 *
 * @returns The `data` portion of the response. Rejects like {@link fetchPublicGraphql}; a GraphQL
 * error rejects with a `GraphqlResponseError` carrying the server's `extensions`.
 */
export async function fetchAuthGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  request: Request,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  return executeGraphqlWithAuth(request, document, variables, {
    timeoutMs: PUBLIC_GRAPHQL_TIMEOUT_MS,
  });
}
