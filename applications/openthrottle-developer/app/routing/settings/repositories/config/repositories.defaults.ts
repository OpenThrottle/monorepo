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
): value is RepositoriesSortBy =>
  REPOSITORIES_SORT_BY.some((candidate) => candidate === value);

export const isRepositoriesSortOrder = (
  value: string,
): value is RepositoriesSortOrder =>
  REPOSITORIES_SORT_ORDER.some((candidate) => candidate === value);
