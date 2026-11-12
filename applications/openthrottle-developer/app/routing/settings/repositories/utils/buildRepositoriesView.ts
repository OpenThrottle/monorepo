import { readSearchParam } from '@openthrottle/react-router-ui-global';
import { parsePagination } from '@openthrottle/react-router-utils';

import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  isRepositoriesSortBy,
  isRepositoriesSortOrder,
  REPOSITORIES_DEFAULT_LIMIT,
  REPOSITORIES_DEFAULT_SORT_BY,
  REPOSITORIES_DEFAULT_SORT_ORDER,
} from '~/routing/settings/repositories/config/repositories.defaults';
import type {
  DiscoveredWorktreesResult,
  RepositoriesView,
} from '~/routing/settings/repositories/types';
import {
  hideMissingRows,
  SHOW_MISSING_PARAM,
  SHOW_MISSING_VALUE,
} from '~/routing/settings/repositories/utils/missing-rows';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { filterRepositoryRows } from '~/routing/settings/repositories/utils/search';
import { sortRepositoryRows } from '~/routing/settings/repositories/utils/sorting';

/** The largest page the URL may ask for. */
const MAX_LIMIT = 100;

export interface BuildRepositoriesViewParams {
  /** The worktree scan, or null while it is still streaming in (or failed). */
  readonly discoveredWorktrees: DiscoveredWorktreesResult | null;
  readonly repositories: WorkspaceRepositoryFieldsFragment[];
  readonly searchParams: URLSearchParams;
}

/**
 * @description The table's rows for one URL, computed from loader data on the client.
 *
 * Search, sort, paging and the show-missing toggle are pure functions of data the page already
 * holds, so they run here instead of in the loader: changing one is a re-render, not a round trip
 * that rescans the disk. With no scan yet the rows are the registered checkouts alone — the same
 * parent rows, without on-disk activity, unregistered worktrees or missing flags — and fill in when
 * the scan resolves.
 *
 * Paging counts PARENT rows only: a parent always carries its worktree children with it, so a group
 * is never split across a page boundary.
 */
export const buildRepositoriesView = (
  params: BuildRepositoriesViewParams,
): RepositoriesView => {
  const { discoveredWorktrees, repositories, searchParams } = params;

  const { limit, offset, page } = parsePagination(searchParams, {
    defaultLimit: REPOSITORIES_DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT,
  });
  const search = readSearchParam(searchParams);

  const sortByParam = searchParams.get('sortBy') ?? '';
  const sortOrderParam = searchParams.get('sortOrder') ?? '';
  const sortBy = isRepositoriesSortBy(sortByParam)
    ? sortByParam
    : REPOSITORIES_DEFAULT_SORT_BY;
  const sortOrder = isRepositoriesSortOrder(sortOrderParam)
    ? sortOrderParam
    : REPOSITORIES_DEFAULT_SORT_ORDER;
  const showMissing =
    searchParams.get(SHOW_MISSING_PARAM) === SHOW_MISSING_VALUE;

  const allRows = buildRepositoryRows(
    repositories,
    discoveredWorktrees?.worktrees ?? [],
    discoveredWorktrees?.problems ?? [],
    discoveredWorktrees?.missingCheckouts ?? [],
  );
  // Hidden by default so the visible worktrees are exactly what is on disk.
  const visibleRows = showMissing ? allRows : hideMissingRows(allRows);
  const { autoExpandedIds, rows: filtered } = filterRepositoryRows(
    visibleRows,
    search,
  );
  const sorted = sortRepositoryRows(filtered, sortBy, sortOrder);

  return {
    autoExpandedIds,
    isUnpopulated: allRows.length === 0,
    limit,
    page,
    rows: sorted.slice(offset, offset + limit),
    search,
    showMissing,
    sortBy,
    sortOrder,
    totalCount: sorted.length,
  };
};
