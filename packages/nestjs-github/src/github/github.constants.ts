/**
 * Hard cap on pages fetched by {@link GitHubService.listAllPulls}. At 100 PRs
 * per page this bounds a single aggregation at 1000 PRs (10 requests) so a very
 * large repo cannot trigger an unbounded request loop. Stats over repos with
 * more than this many matching PRs are truncated to the most recent window.
 */
export const LIST_ALL_PULLS_MAX_PAGES = 10;

/**
 * Hard cap on pages fetched by the per-resource recursive paginators
 * ({@link GitHubService.listIssues}, {@link GitHubService.getPullCommitCount},
 * {@link GitHubService.getPullReviews}). At 100 items per page this bounds each
 * aggregation at 1000 items (10 requests) so a repo (or PR) with thousands of
 * issues/commits/reviews cannot trigger an unbounded loop of sequential
 * blocking calls in a single resolver. Results beyond the cap are dropped.
 */
export const GITHUB_PAGINATION_MAX_PAGES = 10;

/**
 * Default per-request timeout (ms) applied to every GitHub fetch when
 * `GITHUB_REQUEST_TIMEOUT_MS` is unset. A hung upstream TCP connection would
 * otherwise block the NestJS handler indefinitely and, under the `Promise.all`
 * fan-outs in github-stats.service.ts, tie up many in-flight requests at once.
 */
export const GITHUB_REQUEST_TIMEOUT_DEFAULT_MS = 10_000;

/**
 * Default number of *retries* (in addition to the initial attempt) applied to a
 * GitHub request that returns a retryable status (429 / secondary-rate-limit
 * 403 / 5xx) when `GITHUB_MAX_RETRIES` is unset. Bounded so a persistently
 * failing upstream cannot turn one logical call into an unbounded retry storm.
 */
export const GITHUB_MAX_RETRIES_DEFAULT = 3;

/**
 * Default base backoff (ms) used for exponential backoff when GitHub does not
 * send a `Retry-After` / `X-RateLimit-Reset` hint, applied when
 * `GITHUB_RETRY_BASE_DELAY_MS` is unset. Attempt N waits roughly
 * `base * 2^N` (plus jitter), capped by {@link GITHUB_RETRY_MAX_DELAY_MS}.
 */
export const GITHUB_RETRY_BASE_DELAY_DEFAULT_MS = 1_000;

/**
 * Hard ceiling (ms) on any single backoff wait, including one derived from a
 * server-supplied `Retry-After` / `X-RateLimit-Reset`. Prevents a hostile or
 * misconfigured header (e.g. `Retry-After: 86400`) from parking a request for
 * an unreasonable amount of time.
 */
export const GITHUB_RETRY_MAX_DELAY_MS = 30_000;
