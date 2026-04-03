/**
 * @description **V2 API design** for `@openthrottle/nodejs-graphql`: explicit URL/auth, one options
 * object, non-throwing discriminated results, optional DateTime parsing on success (same as V1), and
 * injectable error shaping. The runtime `executeGraphql_v2` will be added in a follow-up; this module
 * defines the contract (types) only.
 *
 * ## Backwards compatibility
 *
 * V1 exports (`executeGraphql`, `executeGraphqlAtUrl`, `executeGraphqlWithAuth`, `getGraphQLUrl`,
 * `parseDateTimeInResponse`) stay unchanged. V2 names use the `_v2` suffix on the primary executor.
 *
 * ## URL and auth
 *
 * - **URL:** Callers pass `url` (full GraphQL HTTP endpoint). No env read inside V2.
 * - **Auth:** Either supply `token` (Bearer), and/or `headers` (raw). Merge order for request
 *   headers: `Content-Type: application/json` → `options.headers` → `Authorization` from
 *   `token` when `token` is non-empty (Bearer wins over any `Authorization` in `headers`).
 *
 * ## Fetch / transport
 *
 * - `signal`: forwarded to `fetch` (AbortSignal).
 * - `fetch`: injectable `fetch` implementation (tests, edge runtimes).
 * - `requestInit`: `Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>` merged into
 *   `fetch` after the executor sets method, body, and headers.
 *
 * ## Results and errors
 *
 * - Default path: {@link GraphqlV2Result} with {@link GraphqlV2Failure} on error (no throw).
 * - Optional `mapFailure` transforms the default failure before return (e.g. workflow codes).
 * - Success path: when `parseDateTime !== false`, apply the same DateTime walk as V1 (`utils`
 *   `parseDateTimeInResponse`) to `data`.
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

/**
 * @description Wire-level GraphQL response (aligned with V1 {@link GraphqlResponse}).
 */
export interface GraphqlV2ResponsePayload<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<GraphqlV2GraphqlErrorItem>;
}

/**
 * @description Single GraphQL error object from the response body.
 */
export interface GraphqlV2GraphqlErrorItem {
  readonly message: string;
  readonly path?: ReadonlyArray<string | number>;
}

/**
 * @description Normalized failure for V2 (transport, GraphQL errors, or missing data).
 */
export type GraphqlV2FailureKind =
  | 'graphql_errors'
  | 'http'
  | 'invalid_json'
  | 'missing_data'
  | 'network'
  | 'unknown';

/**
 * @description Structured error returned when `ok` is false (unless remapped by `mapFailure`).
 */
export interface GraphqlV2Failure {
  readonly cause: unknown | undefined;
  readonly graphqlErrors: ReadonlyArray<GraphqlV2GraphqlErrorItem> | undefined;
  readonly graphqlPath: ReadonlyArray<string | number> | undefined;
  readonly httpStatus: number | undefined;
  readonly kind: GraphqlV2FailureKind;
  readonly message: string;
}

/**
 * @description Context passed to {@link GraphqlV2MapFailure} for richer mapping (workflow parity).
 */
export interface GraphqlV2FailureContext {
  readonly failure: GraphqlV2Failure;
  readonly parsed: GraphqlV2ResponsePayload<unknown> | null;
  readonly rawBody: string | undefined;
  readonly response: Response | null;
}

/**
 * @description Optional hook to map or replace the default {@link GraphqlV2Failure} (e.g. attach
 * domain codes). Return value becomes `error` on the err branch of {@link GraphqlV2Result}.
 */
export type GraphqlV2MapFailure<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> = (context: GraphqlV2FailureContext) => TFailure;

/**
 * @description Successful V2 execution after HTTP OK, no GraphQL errors, and non-null `data`.
 */
export interface GraphqlV2OkResult<TData> {
  readonly data: TData;
  readonly ok: true;
}

/**
 * @description Failed V2 execution (`ok: false`).
 */
export interface GraphqlV2ErrResult<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> {
  readonly error: TFailure;
  readonly ok: false;
}

/**
 * @description Discriminated result of {@link executeGraphql_v2} (non-throwing).
 */
export type GraphqlV2Result<
  TData,
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> = GraphqlV2ErrResult<TFailure> | GraphqlV2OkResult<TData>;

/**
 * @description Options for {@link executeGraphql_v2}: explicit endpoint, auth, DateTime parsing,
 * fetch overrides, and optional failure mapping.
 */
export interface GraphqlV2ExecuteOptions<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> {
  /**
   * @description When false, return raw `data` without V1-style DateTime parsing. Default true
   * (V1 parity).
   */
  readonly parseDateTime?: boolean | undefined;
  /**
   * @description Optional injectable `fetch` (tests, non-global environments).
   */
  readonly fetch?: typeof fetch | undefined;
  /**
   * @description Extra headers merged after `Content-Type` and before Bearer `token`.
   */
  readonly headers?: Readonly<Record<string, string>> | undefined;
  /**
   * @description Optional failure mapper (see {@link GraphqlV2MapFailure}).
   */
  readonly mapFailure?: GraphqlV2MapFailure<TFailure> | undefined;
  /**
   * @description Merged into `fetch` after method/body/headers. Excludes `body`, `headers`,
   * `method`, and `signal` (those are owned by the executor).
   */
  readonly requestInit?:
    | Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>
    | undefined;
  /**
   * @description Passed to `fetch` as `signal`.
   */
  readonly signal?: AbortSignal | undefined;
  /**
   * @description Non-empty string → `Authorization: Bearer <token>` (wins over `headers`).
   */
  readonly token?: string | undefined;
  /**
   * @description Full GraphQL HTTP URL (e.g. `https://host/graphql`).
   */
  readonly url: string;
}

/**
 * @description Type of `executeGraphql_v2` (to be exported from this package once implemented).
 */
export type ExecuteGraphqlV2 = <
  TData,
  TVariables extends Record<string, unknown>,
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  options: GraphqlV2ExecuteOptions<TFailure>,
) => Promise<GraphqlV2Result<TData, TFailure>>;
