import { GraphQLError } from 'graphql';

import type {
  AssertPaginationOptions,
  OffsetPaginationArgs,
} from './offset-pagination.types.ts';

/**
 * @description Rejects an out-of-range `limit` or `offset` the caller actually sent, with a
 * `BAD_USER_INPUT` GraphQLError, so a client asking for 500 rows learns it cannot have them
 * instead of silently getting fewer. An omitted value is never an error: the repository fills
 * in the default. Call it at the top of a resolver; the repository layer clamps and never
 * throws.
 * @throws GraphQLError (BAD_USER_INPUT) when `limit` is outside 1..`max` or `offset` is
 * negative.
 * @public
 */
export const assertPagination = (
  args: OffsetPaginationArgs,
  options: AssertPaginationOptions,
): void => {
  const { limit, offset } = args;
  const isLimitOutOfRange =
    limit !== null && limit !== undefined && (limit < 1 || limit > options.max);

  if (isLimitOutOfRange) {
    throw new GraphQLError(`limit must be between 1 and ${options.max}`, {
      extensions: { code: 'BAD_USER_INPUT', field: 'limit' },
    });
  }
  if (offset !== null && offset !== undefined && offset < 0) {
    throw new GraphQLError('offset must be 0 or more', {
      extensions: { code: 'BAD_USER_INPUT', field: 'offset' },
    });
  }
};
