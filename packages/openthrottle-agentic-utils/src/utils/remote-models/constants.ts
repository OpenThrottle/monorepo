/**
 * Shared defaults for remote model catalogs. Kept in one place so the fetcher,
 * the Nest wrapper, and the operator config namespace agree.
 */

/** OpenRouter's API root. The catalog lives at `${base}/models`. */
export const OPENROUTER_DEFAULT_BASE_URL = `https://openrouter.ai/api/v1`;

/**
 * Attribution header carrying the calling site's URL. Spelled `Referer` (one
 * `r`) — this is the HTTP spelling OpenRouter documents, not `Referrer`.
 */
export const OPENROUTER_REFERER_HEADER = `HTTP-Referer`;

/**
 * Attribution header carrying the calling app's title. OpenRouter's API
 * reference names this one canonically; `X-Title` is an accepted alias kept
 * from the older quickstart, so we send the canonical spelling.
 */
export const OPENROUTER_TITLE_HEADER = `X-OpenRouter-Title`;

/**
 * Default catalog request timeout, in milliseconds. Higher than local
 * discovery's port probe: this is one internet round trip for a ~640 KB body,
 * not a sweep across dozens of dead ports.
 */
export const DEFAULT_REMOTE_CATALOG_TIMEOUT_MS = 10_000;
