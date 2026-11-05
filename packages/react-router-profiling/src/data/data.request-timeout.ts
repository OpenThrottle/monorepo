/**
 * @description Default per-request timeout for the metrics fetchers; see
 * `buildRequestSignal` in `../utils/request-timeout`.
 */

/** Default per-request timeout (ms). Bounds a single metrics fetch. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
