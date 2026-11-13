/**
 * @description Default per-request timeout (milliseconds) applied to the
 * underlying `fetch` when a caller does not pass an explicit `timeoutMs`.
 * Bounds a request so a stalled openthrottle-server connection cannot hold the
 * request open indefinitely.
 * @public
 */
export const DEFAULT_GRAPHQL_TIMEOUT_MS = 15_000;

/**
 * @description Marker prefix on the message of the `Error` thrown when a
 * request exceeds its timeout. Consumers match on this to classify the failure
 * as a distinct timeout kind rather than a generic network error.
 * @public
 */
export const GRAPHQL_TIMEOUT_ERROR_PREFIX = `openthrottle-server GraphQL request timed out`;

/**
 * @description Build the `AbortSignal` enforcing the per-request timeout.
 * `0` or a negative value disables the timeout (no signal). Defaults to
 * {@link DEFAULT_GRAPHQL_TIMEOUT_MS} when `timeoutMs` is `undefined`. When a
 * caller-supplied `signal` is provided, the returned signal aborts when either
 * the timeout fires or the caller's signal aborts.
 */
export function buildTimeoutSignal(
  timeoutMs: number | undefined,
  callerSignal?: AbortSignal | undefined,
): AbortSignal | undefined {
  const ms = timeoutMs ?? DEFAULT_GRAPHQL_TIMEOUT_MS;
  const timeoutSignal = ms > 0 ? AbortSignal.timeout(ms) : undefined;

  if (timeoutSignal == null) {
    return callerSignal;
  }

  if (callerSignal == null) {
    return timeoutSignal;
  }

  return AbortSignal.any([callerSignal, timeoutSignal]);
}

/**
 * @description Wrap a thrown `fetch` rejection: when it is the abort raised by
 * our timeout signal (`TimeoutError`/`AbortError`), rethrow a recognizable
 * timeout `Error` (message prefixed with {@link GRAPHQL_TIMEOUT_ERROR_PREFIX});
 * otherwise rethrow the original error unchanged.
 */
export function rethrowAsTimeoutIfAborted(
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
