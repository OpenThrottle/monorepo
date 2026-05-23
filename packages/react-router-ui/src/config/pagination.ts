/**
 * @description Tunable defaults for windowed page links in OpenThrottlePagination.
 */
export const PAGINATION_CONFIG = {
  /**
   * When `totalPages` is at or below this value, every page number is rendered (no ellipsis).
   */
  showAllPagesThreshold: 7,

  /**
   * Pages shown on each side of the current page in the numeric strip.
   */
  siblingCount: 1,
} as const;

export type PaginationConfig = typeof PAGINATION_CONFIG;
