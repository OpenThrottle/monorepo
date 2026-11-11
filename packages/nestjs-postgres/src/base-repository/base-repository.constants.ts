/**
 * @description Page size `findByPaginated` uses when the caller passes no `take`.
 * @public
 */
export const POSTGRES_DEFAULT_PAGE_SIZE = 25;

/**
 * @description Largest `take` `findByPaginated` honours; larger values are clamped to it.
 * @public
 */
export const POSTGRES_MAX_PAGE_SIZE = 100;

/**
 * @description Most rows `updateManyReturning` will touch and reload; larger sets must use
 * `updateMany`, which returns only a count.
 * @public
 */
export const POSTGRES_MAX_RETURNING_ROWS = 1_000;

/**
 * @description Postgres caps a single statement at 65,535 bind parameters, which bounds how
 * many rows one multi-row INSERT can carry.
 * @public
 */
export const POSTGRES_MAX_BIND_PARAMS = 65_535;

/**
 * @description Upper bound on rows per INSERT, so very narrow tables still get reasonably
 * sized statements even when the bind-parameter limit would allow far more.
 * @public
 */
export const POSTGRES_MAX_INSERT_ROWS = 1_000;
