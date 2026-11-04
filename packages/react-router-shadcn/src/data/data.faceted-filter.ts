/**
 * @description User-facing copy for `FacetedFilter`. Hoisted out of the
 * component so specs and consumers assert against the same constants.
 */

/**
 * @public
 * @description Copy rendered by {@link FacetedFilter}: the trigger summary
 * badges, the group-toggle hints and the search empty state.
 */
export const FACETED_FILTER_COPY = {
  all: `All`,
  clearGroup: `Clear`,
  noResults: `No results.`,
  searchPlaceholder: (title: string): string =>
    `Filter ${title.toLowerCase()}…`,
  selectGroup: `Select all`,
  selectedCount: (count: number): string => `${count} selected`,
} as const;
