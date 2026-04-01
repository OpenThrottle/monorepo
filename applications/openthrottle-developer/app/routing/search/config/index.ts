/**
 * @description Default and shared settings for the search route and API.
 */

/** Default number of search chunks to request per page. */
export const DEFAULT_SEARCH_LIMIT = 10;

/** Options for the limit filter (results per page). */
export const SEARCH_LIMIT_OPTIONS = [10, 20, 50] as const;

/** Base path for the search route (used by URL utils). */
export const SEARCH_BASE_PATH = '/search';
