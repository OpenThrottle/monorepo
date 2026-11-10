/**
 * @description Search-param defaults and allowed values for the repositories
 * index route. Mirrors `~/routing/projects/config`: `as const` arrays with
 * derived union types (no TS enums) plus narrowing guards the loader uses to
 * turn raw search params into typed values.
 */

export const REPOSITORIES_DEFAULT_LIMIT = 10;

export const REPOSITORIES_SORT_BY = [
  'checkoutCount',
  'name',
  'updatedAt',
] as const;

export const REPOSITORIES_SORT_ORDER = ['asc', 'desc'] as const;

export type RepositoriesSortBy = (typeof REPOSITORIES_SORT_BY)[number];
export type RepositoriesSortOrder = (typeof REPOSITORIES_SORT_ORDER)[number];

export const REPOSITORIES_DEFAULT_SORT_BY: RepositoriesSortBy = 'name';
export const REPOSITORIES_DEFAULT_SORT_ORDER: RepositoriesSortOrder = 'asc';

export const REPOSITORIES_SORT_OPTIONS: readonly {
  readonly label: string;
  readonly value: `${RepositoriesSortBy}-${RepositoriesSortOrder}`;
}[] = [
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Name Z-A', value: 'name-desc' },
  { label: 'Recently updated', value: 'updatedAt-desc' },
  { label: 'Least recently updated', value: 'updatedAt-asc' },
  { label: 'Most checkouts', value: 'checkoutCount-desc' },
  { label: 'Fewest checkouts', value: 'checkoutCount-asc' },
];

export const isRepositoriesSortBy = (
  value: string,
): value is RepositoriesSortBy => {
  return REPOSITORIES_SORT_BY.some((candidate) => candidate === value);
};

export const isRepositoriesSortOrder = (
  value: string,
): value is RepositoriesSortOrder => {
  return REPOSITORIES_SORT_ORDER.some((candidate) => candidate === value);
};

/**
 * Search params that only change what the table shows — never what the loader fetches. A
 * navigation that changes nothing else skips the loader (see `shouldRevalidateRepositories`).
 * `q` is the toolbar search's legacy key, which it strips on commit.
 */
export const REPOSITORIES_VIEW_PARAMS: readonly string[] = [
  'limit',
  'page',
  'q',
  'search',
  'showMissing',
  'sortBy',
  'sortOrder',
];

/** Route-action intent that forces a fresh on-disk worktree scan, bypassing the server's cache. */
export const RESCAN_WORKTREES_INTENT = 'rescanWorktrees';

/**
 * Route-action intents that read without changing anything (the folder picker's browsing), so
 * finishing one has nothing to refresh.
 */
export const REPOSITORIES_READ_ONLY_INTENTS: readonly string[] = [
  'browseDirectory',
  'pickFolderNative',
];
