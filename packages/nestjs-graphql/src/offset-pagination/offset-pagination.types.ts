/**
 * @description The pagination fields `assertPagination` checks, as a resolver receives them.
 * @public
 */
export interface OffsetPaginationArgs {
  readonly limit?: number | null;
  readonly offset?: number | null;
}

/**
 * @description Bounds for `assertPagination`: the largest `limit` this list serves.
 * @public
 */
export interface AssertPaginationOptions {
  readonly max: number;
}
