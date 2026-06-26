/**
 * @description **V2 API** for `@openthrottle/nodejs-graphql`: explicit URL/auth, one options object,
 * non-throwing discriminated results, optional DateTime parsing on success (same as V1), and
 * injectable error shaping via {@link executeGraphql_v2}.
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
 *
 * ## Retry (opt-in)
 *
 * - `retry` is **off by default** so loader semantics never change silently. When supplied, the
 *   executor re-runs the request up to `retry.attempts` extra times after the first try, sleeping
 *   `retry.backoffMs * 2^(retryIndex)` (exponential) between attempts.
 * - The default {@link defaultRetryOn} predicate retries **only** transient transport failures:
 *   `network` and `http` with a 5xx status. It never retries `graphql_errors` or `missing_data`
 *   (deterministic), nor `invalid_json` / `unknown`.
 * - **Mutations:** retrying is not safe for non-idempotent operations. Retry is opt-in precisely so
 *   mutation callers do not get automatic retries; only enable `retry` for queries or idempotent
 *   mutations.
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { asGraphqlPayload, parseDateTimeInResponse } from './utils.ts';

/**
 * @description Wire-level GraphQL response (aligned with V1 {@link GraphqlResponse}).
 * @publicApi
 */
export interface GraphqlV2ResponsePayload<TData> {
  readonly data?: TData;
  readonly errors?: ReadonlyArray<GraphqlV2GraphqlErrorItem>;
}

/**
 * @description Single GraphQL error object from the response body.
 * @publicApi
 */
export interface GraphqlV2GraphqlErrorItem {
  readonly message: string;
  readonly path?: ReadonlyArray<string | number>;
}

/**
 * @description Normalized failure for V2 (transport, GraphQL errors,
 * missing data, or unknown).
 * @publicApi
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
 * @publicApi
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
 * @publicApi
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
 * @publicApi
 */
export type GraphqlV2MapFailure<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> = (context: GraphqlV2FailureContext) => TFailure;

/**
 * @description Predicate deciding whether a {@link GraphqlV2Failure} should be retried.
 * @publicApi
 */
export type GraphqlV2RetryOn = (failure: GraphqlV2Failure) => boolean;

/**
 * @description Opt-in retry policy for {@link executeGraphql_v2}. Off by default so loader
 * semantics do not change silently. Not safe for non-idempotent mutations — see module docs.
 * @publicApi
 */
export interface GraphqlV2RetryOptions {
  /**
   * @description Number of *extra* attempts after the first try (so total tries = `attempts + 1`).
   * Values `<= 0` disable retrying.
   */
  readonly attempts: number;
  /**
   * @description Base delay in milliseconds between attempts. The actual wait grows exponentially:
   * `backoffMs * 2^(retryIndex)` where `retryIndex` starts at 0 for the first retry. Values
   * `<= 0` retry immediately with no delay.
   */
  readonly backoffMs: number;
  /**
   * @description Predicate deciding whether a given failure is retryable. Defaults to
   * {@link defaultRetryOn} (retry only `network` and 5xx `http`).
   */
  readonly retryOn?: GraphqlV2RetryOn | undefined;
}

/**
 * @description Default retry predicate: retry only transient transport failures — `network` errors
 * and `http` failures with a 5xx status. Never retries `graphql_errors`, `missing_data`,
 * `invalid_json`, or `unknown` (deterministic / not safely retryable).
 * @publicApi
 */
export const defaultRetryOn: GraphqlV2RetryOn = (failure) => {
  if (failure.kind === 'network') {
    return true;
  }

  if (failure.kind === 'http') {
    return failure.httpStatus != null && failure.httpStatus >= 500;
  }

  return false;
};

/**
 * @description Successful V2 execution after HTTP OK, no GraphQL errors, and non-null `data`.
 * @publicApi
 */
export interface GraphqlV2OkResult<TData> {
  readonly data: TData;
  readonly ok: true;
}

/**
 * @description Failed V2 execution (`ok: false`).
 * @publicApi
 */
export interface GraphqlV2ErrResult<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> {
  readonly error: TFailure;
  readonly ok: false;
}

/**
 * @description Discriminated result of {@link executeGraphql_v2} (non-throwing).
 * @publicApi
 */
export type GraphqlV2Result<
  TData,
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> = GraphqlV2ErrResult<TFailure> | GraphqlV2OkResult<TData>;

/**
 * @description Options for {@link executeGraphql_v2}: explicit endpoint, auth, DateTime parsing,
 * fetch overrides, and optional failure mapping.
 * @publicApi
 */
export interface GraphqlV2ExecuteOptions<
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
> {
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
   * @description When false, return raw `data` without V1-style DateTime parsing. Default true
   * (V1 parity).
   */
  readonly parseDateTime?: boolean | undefined;
  /**
   * @description Merged into `fetch` after method/body/headers. Excludes `body`, `headers`,
   * `method`, and `signal` (those are owned by the executor).
   */
  readonly requestInit?:
    | Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>
    | undefined;
  /**
   * @description Opt-in retry policy for transient transport failures. Off by default. Not safe
   * for non-idempotent mutations — see {@link GraphqlV2RetryOptions} and module docs.
   */
  readonly retry?: GraphqlV2RetryOptions | undefined;
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
 * @publicApi
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

/**
 * @description Build request headers: `Content-Type` → `options.headers` → Bearer from `token`.
 *
 * `Content-Type: application/json` is set first and may be overridden by
 * `options.headers` (unlike `requestInit`, which excludes `headers`). No
 * `Accept` header is set, so a caller wanting GraphQL-over-HTTP content
 * negotiation (e.g. `application/graphql-response+json`) must supply both
 * `Accept` and `Content-Type` via `options.headers`. Low impact today;
 * tracked for future GraphQL-over-HTTP spec compliance.
 */
const buildV2Headers = (
  options: GraphqlV2ExecuteOptions,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.token != null && options.token !== '') {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
};

/**
 * @description Outcome of one execution attempt: the discriminated result plus the *raw*
 * (pre-`mapFailure`) failure, so the retry loop can decide retryability on the base failure shape.
 */
interface GraphqlV2AttemptOutcome<TData, TFailure extends GraphqlV2Failure> {
  readonly rawFailure: GraphqlV2Failure | null;
  readonly result: GraphqlV2Result<TData, TFailure>;
}

/**
 * @description Sleep for `ms` milliseconds (no-op when `ms <= 0`).
 */
const delay = (ms: number): Promise<void> =>
  ms > 0
    ? new Promise((resolve) => {
        setTimeout(resolve, ms);
      })
    : Promise.resolve();

/**
 * @description Run a single GraphQL attempt with explicit URL and non-throwing result.
 */
const executeGraphqlV2Once = async <
  TData,
  TVariables extends Record<string, unknown>,
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  options: GraphqlV2ExecuteOptions<TFailure>,
): Promise<GraphqlV2AttemptOutcome<TData, TFailure>> => {
  const finishFailure = (
    failure: GraphqlV2Failure,
    parsedPayload: GraphqlV2ResponsePayload<unknown> | null,
    body: string | undefined,
    res: Response | null,
  ): GraphqlV2AttemptOutcome<TData, TFailure> => {
    const context: GraphqlV2FailureContext = {
      failure,
      parsed: parsedPayload,
      rawBody: body,
      response: res,
    };

    const error: TFailure = options.mapFailure
      ? options.mapFailure(context)
      : (failure as TFailure);

    return { rawFailure: failure, result: { error, ok: false } };
  };

  const fetchFn = options.fetch ?? fetch;
  const body = JSON.stringify({
    query: print(document),
    variables: variables ?? undefined,
  });

  const headers = buildV2Headers(options);
  let response: Response | null = null;
  let rawBody: string | undefined;

  try {
    response = await fetchFn(options.url, {
      ...options.requestInit,
      body,
      headers,
      method: 'POST',
      signal: options.signal,
    });
  } catch (cause) {
    return finishFailure(
      {
        cause,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: undefined,
        kind: 'network',
        message:
          cause instanceof Error ? cause.message : 'GraphQL request failed',
      },
      null,
      undefined,
      null,
    );
  }

  try {
    rawBody = await response.text();
  } catch (cause) {
    return finishFailure(
      {
        cause,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: response.status,
        kind: 'network',
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to read response body',
      },
      null,
      undefined,
      response,
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = rawBody === '' ? null : JSON.parse(rawBody);
  } catch (cause) {
    return finishFailure(
      {
        cause,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: response.status,
        kind: 'invalid_json',
        message: 'GraphQL response was not valid JSON',
      },
      null,
      rawBody,
      response,
    );
  }

  const parsed = asGraphqlPayload(parsedJson);

  if (!response.ok) {
    const firstGql = parsed?.errors?.[0];
    const statusFallback = `HTTP ${String(response.status)}`;
    const httpMessage =
      (firstGql?.message ?? response.statusText) || statusFallback;

    return finishFailure(
      {
        cause: undefined,
        graphqlErrors: parsed?.errors,
        graphqlPath: firstGql?.path,
        httpStatus: response.status,
        kind: 'http',
        message: httpMessage,
      },
      parsed,
      rawBody,
      response,
    );
  }

  if (parsed == null) {
    return finishFailure(
      {
        cause: undefined,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: response.status,
        kind: 'unknown',
        message: 'GraphQL response had unexpected shape',
      },
      null,
      rawBody,
      response,
    );
  }

  if (parsed.errors != null && parsed.errors.length > 0) {
    const first = parsed.errors[0];
    return finishFailure(
      {
        cause: undefined,
        graphqlErrors: parsed.errors,
        graphqlPath: first?.path,
        httpStatus: response.status,
        kind: 'graphql_errors',
        message: first?.message ?? 'GraphQL errors',
      },
      parsed,
      rawBody,
      response,
    );
  }

  if (parsed.data == null) {
    return finishFailure(
      {
        cause: undefined,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: response.status,
        kind: 'missing_data',
        message: 'GraphQL response missing data',
      },
      parsed,
      rawBody,
      response,
    );
  }

  const data =
    options.parseDateTime === false
      ? parsed.data
      : parseDateTimeInResponse(parsed.data);

  return {
    rawFailure: null,
    result: {
      // `as TData` is sound here: post-validation success path (HTTP OK, no
      // GraphQL errors, non-null `data`). The cast only re-attaches the
      // codegen-guaranteed shape that `parseDateTimeInResponse`'s `unknown`
      // return erases (and `parsed.data` is already `unknown`). Do not
      // "tighten" away — there is no runtime type to narrow to.
      data: data as TData,
      ok: true,
    },
  };
};

/**
 * @description Execute a GraphQL operation with explicit URL and non-throwing {@link GraphqlV2Result}.
 *
 * When `options.retry` is supplied, transient transport failures (per
 * `options.retry.retryOn`, defaulting to {@link defaultRetryOn}) are retried with exponential
 * backoff. Retry is off by default and is not safe for non-idempotent mutations (see module docs).
 * @publicApi
 */
export const executeGraphql_v2: ExecuteGraphqlV2 = async <
  TData,
  TVariables extends Record<string, unknown>,
  TFailure extends GraphqlV2Failure = GraphqlV2Failure,
>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  options: GraphqlV2ExecuteOptions<TFailure>,
): Promise<GraphqlV2Result<TData, TFailure>> => {
  const retry = options.retry;
  const maxRetries = retry != null && retry.attempts > 0 ? retry.attempts : 0;
  const retryOn = retry?.retryOn ?? defaultRetryOn;
  const baseBackoffMs = retry?.backoffMs ?? 0;

  let outcome = await executeGraphqlV2Once(document, variables, options);

  for (let retryIndex = 0; retryIndex < maxRetries; retryIndex += 1) {
    if (outcome.rawFailure == null || !retryOn(outcome.rawFailure)) {
      break;
    }

    if (options.signal?.aborted === true) {
      break;
    }

    // Retries are intentionally sequential: each attempt waits for the prior failure and its
    // backoff, so awaiting inside the loop is required.
    // eslint-disable-next-line no-await-in-loop -- sequential backoff between dependent attempts
    await delay(baseBackoffMs * 2 ** retryIndex);

    // eslint-disable-next-line no-await-in-loop -- next attempt depends on the previous outcome
    outcome = await executeGraphqlV2Once(document, variables, options);
  }

  return outcome.result;
};
