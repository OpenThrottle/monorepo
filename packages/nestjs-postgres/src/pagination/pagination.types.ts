/**
 * @description An offset-pagination request as it arrives from a caller. Either field may be
 * absent (GraphQL sends `null`, TypeScript callers may omit it); absence means the default.
 * @public
 */
export interface PaginationInput {
  readonly limit?: number | null;
  readonly offset?: number | null;
}

/**
 * @description Per-call overrides for `resolvePagination` / `paginate`: `defaultLimit`
 * replaces `PAGINATION_DEFAULT_LIMIT` and `max` replaces `PAGINATION_MAX_LIMIT`, for this call
 * only. Each is optional because most call sites override one, not both.
 * @public
 */
export interface PaginationOptions {
  readonly defaultLimit?: number;
  readonly max?: number;
}

/**
 * @description Clamped pagination bounds, ready for TypeORM `take` / `skip`.
 * @public
 */
export interface ResolvedPagination {
  readonly skip: number;
  readonly take: number;
}

/**
 * @description One page of rows plus the total row count across every page.
 * @public
 */
export interface OffsetPage<TItem> {
  readonly items: TItem[];
  readonly totalCount: number;
}
