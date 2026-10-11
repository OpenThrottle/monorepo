import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphql } from '@openthrottle/react-router-graphql';

/**
 * @description Upper bound (milliseconds) on a public GraphQL request made from
 * a loader. Shorter than the shared 15s default: a marketing-page loader should
 * fail fast and render its error state rather than hold the SSR response open.
 */
const PUBLIC_GRAPHQL_TIMEOUT_MS = 8_000;

/**
 * @description Server-side, unauthenticated GraphQL request against
 * openthrottle-server (`API_URL_INTERNAL`). Use from route loaders only, with
 * typed documents from `~/__generated__/graphql`, and only for operations the
 * server marks `@Public()` (the blog queries).
 *
 * Deliberately sends no `Authorization` header and never reads the request
 * cookie: the website is public and unauthenticated, so there is nothing to
 * forward. Never call this from a component, hook or any client-reachable
 * module — the `.server.ts` suffix keeps it out of the browser bundle, which
 * is what keeps the CSP `connect-src` self-only.
 *
 * @param document - Typed document (query) from codegen; the result type is inferred.
 * @param variables - Optional variables object.
 *
 * @returns The `data` portion of the response. Rejects on transport failure,
 * GraphQL errors, a non-OK status, or after {@link PUBLIC_GRAPHQL_TIMEOUT_MS}.
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
