/**
 * @description Static copy for the `/usage` branch filter. The control is a
 * searchable dropdown rather than a chip row, so it needs a label, a
 * placeholder, and copy for the empty / loading / truncated states.
 */

/** Sentinel option value that clears `?skillBranch=`. */
export const BRANCH_FILTER_ALL_VALUE = '__all__';

export const BRANCH_FILTER_COPY = {
  all: 'All branches',
  empty: 'No branch matches that search.',
  label: 'Branch',
  loading: 'Searching branches…',
  placeholder: 'All branches',
  searchPlaceholder: 'Search branches…',
  /** Shown when the server truncated the result set. */
  truncated: (count: number): string =>
    `Showing the first ${count} branches — keep typing to narrow.`,
} as const;
