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

/** Optional pagination input accepted by list queries. */
export interface ListPaginationInput {
  readonly limit?: number;
  readonly offset?: number;
}

/** Resolved, clamped pagination bounds suitable for TypeORM `take`/`skip`. */
export interface ResolvedListPagination {
  readonly skip: number;
  readonly take: number;
}

/**
 * @description Clamps an optional pagination input into safe TypeORM
 * `take`/`skip` bounds. `limit` is clamped to `[1, LIST_PAGINATION_MAX_LIMIT]`
 * (defaulting to `LIST_PAGINATION_DEFAULT_LIMIT`); `offset` is floored at 0.
 */
export const resolveListPagination = (
  pagination?: ListPaginationInput,
): ResolvedListPagination => {
  const requestedLimit = pagination?.limit ?? LIST_PAGINATION_DEFAULT_LIMIT;
  const take = Math.min(
    Math.max(Math.floor(requestedLimit), 1),
    LIST_PAGINATION_MAX_LIMIT,
  );

  const requestedOffset = pagination?.offset ?? 0;
  const skip = Math.max(Math.floor(requestedOffset), 0);

  return { skip, take };
};
