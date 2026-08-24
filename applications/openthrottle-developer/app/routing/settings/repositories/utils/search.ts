import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

export interface FilterRepositoryRowsResult {
  /**
   * Ids of parent rows that survived only because a child matched. The table
   * expands these so a search on a worktree never renders a closed, seemingly
   * unrelated parent.
   */
  autoExpandedIds: string[];
  rows: RepositoryCheckoutRow[];
}

const matchesRow = (row: RepositoryCheckoutRow, term: string): boolean =>
  [
    row.branch,
    row.displayName,
    row.path,
    row.remoteUrl,
    row.repositoryName,
  ].some((field) => field?.toLowerCase().includes(term));

/**
 * @description Case-insensitive filter over the nested row model, matching
 * repository name, display name (a checkout's label or a worktree's directory
 * name), on-disk path, remote url, and branch. A parent match keeps all of its
 * children; a child match pulls its
 * parent back in (narrowed to the matching children) and reports the parent id
 * so the caller can auto-expand that group.
 */
export function filterRepositoryRows(
  rows: RepositoryCheckoutRow[],
  search: string,
): FilterRepositoryRowsResult {
  const term = search.trim().toLowerCase();

  if (term.length === 0) {
    return { autoExpandedIds: [], rows };
  }

  const autoExpandedIds: string[] = [];
  const filtered: RepositoryCheckoutRow[] = [];

  for (const row of rows) {
    const children = row.children ?? [];

    if (matchesRow(row, term)) {
      filtered.push(row);
      continue;
    }

    const matchingChildren = children.filter((child) =>
      matchesRow(child, term),
    );

    if (matchingChildren.length === 0) {
      continue;
    }

    autoExpandedIds.push(row.id);
    filtered.push({ ...row, children: matchingChildren });
  }

  return { autoExpandedIds, rows: filtered };
}
