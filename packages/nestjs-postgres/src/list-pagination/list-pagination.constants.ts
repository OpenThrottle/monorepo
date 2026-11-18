/**
 * @description Shared pagination clamping for unbounded list queries that back
 * GraphQL fields. Mirrors the agent-conversation clamp pattern: callers may pass
 * an optional `{ limit, offset }`; this resolves them into safe `take`/`skip`
 * bounds so a growing table can never return an unbounded result set.
 */

/** Default page size when a caller does not request a limit. */
export const LIST_PAGINATION_DEFAULT_LIMIT = 50;

/** Hard upper bound on page size, regardless of requested limit. */
export const LIST_PAGINATION_MAX_LIMIT = 200;
