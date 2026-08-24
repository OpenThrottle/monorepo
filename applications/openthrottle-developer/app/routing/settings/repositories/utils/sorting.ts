import type {
  RepositoriesSortBy,
  RepositoriesSortOrder,
} from '~/routing/settings/repositories/config/repositories.defaults';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

const checkoutCount = (row: RepositoryCheckoutRow): number =>
  1 + (row.children?.length ?? 0);

const compareRows = (
  a: RepositoryCheckoutRow,
  b: RepositoryCheckoutRow,
  sortBy: RepositoriesSortBy,
): number => {
  switch (sortBy) {
    case 'checkoutCount':
      return checkoutCount(a) - checkoutCount(b);

    case 'name':
      return (
        a.repositoryName.localeCompare(b.repositoryName, undefined, {
          sensitivity: 'base',
        }) ||
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        })
      );

    case 'updatedAt':
      // A discovered-only worktree has no registered row and therefore no
      // updatedAt; it sorts as the empty string, i.e. oldest.
      return String(a.updatedAt ?? '').localeCompare(String(b.updatedAt ?? ''));

    default:
      return 0;
  }
};

/**
 * @description Sort parent rows, then sort each parent's children within that
 * parent only — children never escape their group, so the nesting survives any
 * sort. Returns new arrays; the input is left untouched.
 */
export function sortRepositoryRows(
  rows: RepositoryCheckoutRow[],
  sortBy: RepositoriesSortBy,
  sortOrder: RepositoriesSortOrder,
): RepositoryCheckoutRow[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...rows].sort(
    (a, b) => direction * compareRows(a, b, sortBy),
  );

  return sorted.map((row) =>
    row.children
      ? {
          ...row,
          children: [...row.children].sort(
            (a, b) => direction * compareRows(a, b, sortBy),
          ),
        }
      : row,
  );
}
