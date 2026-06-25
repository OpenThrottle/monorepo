/**
 * @description Shared request-timeout/abort plumbing for the metrics fetchers.
 * Composes a caller-supplied AbortSignal (e.g. from a hook unmounting) with a
 * per-request timeout so a hung openthrottle-server connection cannot leave a
 * metrics card spinning forever or stack overlapping polls.
 */

/** Default per-request timeout (ms). Bounds a single metrics fetch. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/**
 * @description Builds the effective AbortSignal for a fetch: a timeout signal
 * (via AbortSignal.timeout) optionally combined with the caller's signal (via
 * AbortSignal.any). Pass `timeoutMs <= 0` to disable the timeout. Returns the
 * caller's signal unchanged when no timeout applies, or undefined when neither
 * is present.
 */
export function buildRequestSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal | undefined {
  if (timeoutMs <= 0) {
    return callerSignal;
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (callerSignal == null) {
    return timeoutSignal;
  }

  return AbortSignal.any([callerSignal, timeoutSignal]);
}

/**
 * @description Reports whether a thrown error is an abort/timeout, regardless of
 * whether it came from a caller abort or an AbortSignal.timeout (which throws a
 * TimeoutError). Used to swallow expected cancellations instead of surfacing
 * them as fetch errors.
 */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}
