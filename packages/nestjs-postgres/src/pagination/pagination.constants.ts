/**
 * @description The one offset-pagination policy for list queries: a caller that sends no
 * `limit` gets {@link PAGINATION_DEFAULT_LIMIT} rows, and no request returns more than
 * {@link PAGINATION_MAX_LIMIT} unless the call site passes its own `max`.
 */

/**
 * @description Page size when a caller does not request a limit.
 * @public
 */
export const PAGINATION_DEFAULT_LIMIT = 25;

/**
 * @description Largest page served when the call site passes no `max` override.
 * @public
 */
export const PAGINATION_MAX_LIMIT = 100;
