import {
  LIST_PAGINATION_DEFAULT_LIMIT,
  LIST_PAGINATION_MAX_LIMIT,
} from './list-pagination.constants.ts';
import type {
  ListPaginationInput,
  ResolvedListPagination,
} from './list-pagination.types.ts';
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
