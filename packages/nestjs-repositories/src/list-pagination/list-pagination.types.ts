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
