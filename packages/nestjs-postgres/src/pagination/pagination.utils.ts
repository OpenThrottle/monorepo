import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from './pagination.constants.ts';
import type {
  OffsetPage,
  PaginationInput,
  PaginationOptions,
  ResolvedPagination,
} from './pagination.types.ts';

/**
 * @description Clamps a pagination request into safe TypeORM bounds. `limit` defaults to
 * `options.defaultLimit` or `PAGINATION_DEFAULT_LIMIT` and is clamped to `[1, max]`, where
 * `max` is `options.max` or `PAGINATION_MAX_LIMIT`; `offset` defaults to 0 and is floored at
 * 0. Fractions are floored.
 * Never throws: rejecting out-of-range input is the GraphQL boundary's job.
 * @public
 */
export const resolvePagination = (
  input?: PaginationInput,
  options?: PaginationOptions,
): ResolvedPagination => {
  const max = Math.max(1, Math.floor(options?.max ?? PAGINATION_MAX_LIMIT));
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULT_LIMIT;
  const requestedLimit = input?.limit ?? defaultLimit;
  const take = Math.min(Math.max(Math.floor(requestedLimit), 1), max);
  const skip = Math.max(Math.floor(input?.offset ?? 0), 0);

  return { skip, take };
};

/**
 * @description Reads one page of a query builder: applies {@link resolvePagination}, then
 * `skip` / `take` and `getManyAndCount`. The builder keeps its own `where`, joins and order,
 * so custom orders (e.g. a scoped sort column with `NULLS LAST`) page the same way as
 * `BaseRepository.findByPaginated`. Never throws for out-of-range input; it clamps.
 * @public
 */
export const paginate = async <TEntity extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<TEntity>,
  input?: PaginationInput,
  options?: PaginationOptions,
): Promise<OffsetPage<TEntity>> => {
  const { skip, take } = resolvePagination(input, options);
  const [items, totalCount] = await queryBuilder
    .skip(skip)
    .take(take)
    .getManyAndCount();

  return { items, totalCount };
};

/**
 * @description Whether rows remain after this page, given the `skip` it was read from. A
 * negative `skip` counts as 0, matching how {@link resolvePagination} clamps it.
 * @public
 */
export const hasNextPage = (
  page: OffsetPage<unknown>,
  skip: number,
): boolean => {
  return Math.max(0, skip) + page.items.length < page.totalCount;
};
