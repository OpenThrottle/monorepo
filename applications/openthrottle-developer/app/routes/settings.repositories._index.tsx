import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/settings.repositories._index';
import { GetSettingsRepositoriesDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import {
  addFolder,
  browseDirectory,
  cloneRepo,
  deleteRepo,
  pickFolderNative,
  pruneWorktreeCheckouts,
  refreshCheckout,
} from '~/routing/settings/repositories/actions/repositories';
import { RepositoriesSection } from '~/routing/settings/repositories/components/RepositoriesSection';
import {
  isRepositoriesSortBy,
  isRepositoriesSortOrder,
  REPOSITORIES_DEFAULT_LIMIT,
  REPOSITORIES_DEFAULT_SORT_BY,
  REPOSITORIES_DEFAULT_SORT_ORDER,
} from '~/routing/settings/repositories/config/repositories.defaults';
import {
  hideMissingRows,
  PRUNE_WORKTREE_CHECKOUTS_INTENT,
  SHOW_MISSING_PARAM,
  SHOW_MISSING_VALUE,
} from '~/routing/settings/repositories/utils/missing-rows';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { filterRepositoryRows } from '~/routing/settings/repositories/utils/search';
import { sortRepositoryRows } from '~/routing/settings/repositories/utils/sorting';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Repositories',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetSettingsRepositoriesDocument,
  );

  const url = args.url;
  const { limit, offset, page } = parsePagination(url.searchParams, {
    defaultLimit: REPOSITORIES_DEFAULT_LIMIT,
    maxLimit: 100,
  });
  const search = readSearchParam(url.searchParams);

  const sortByParam = url.searchParams.get('sortBy') ?? '';
  const sortOrderParam = url.searchParams.get('sortOrder') ?? '';
  const sortBy = isRepositoriesSortBy(sortByParam)
    ? sortByParam
    : REPOSITORIES_DEFAULT_SORT_BY;
  const sortOrder = isRepositoriesSortOrder(sortOrderParam)
    ? sortOrderParam
    : REPOSITORIES_DEFAULT_SORT_ORDER;

  const showMissing =
    url.searchParams.get(SHOW_MISSING_PARAM) === SHOW_MISSING_VALUE;

  const allRows = buildRepositoryRows(
    data.workspaceRepositories,
    data.discoveredWorktrees.worktrees,
    data.discoveredWorktrees.problems,
    data.discoveredWorktrees.missingCheckouts,
  );
  // Hidden by default so the visible worktrees are exactly what is on disk.
  const visibleRows = showMissing ? allRows : hideMissingRows(allRows);
  const { autoExpandedIds, rows: filtered } = filterRepositoryRows(
    visibleRows,
    search,
  );
  const sorted = sortRepositoryRows(filtered, sortBy, sortOrder);

  // Paging counts PARENT rows only: a parent always carries its worktree
  // children with it, so a group is never split across a page boundary.
  const totalCount = sorted.length;
  const rows = sorted.slice(offset, offset + limit);

  return {
    autoExpandedIds,
    discoveredFolders: data.discoveredFolders,
    discoveredWorktrees: data.discoveredWorktrees,
    isUnpopulated: allRows.length === 0,
    limit,
    page,
    pickerCapabilities: data.workspacePickerCapabilities,
    rows,
    search,
    showMissing,
    sortBy,
    sortOrder,
    totalCount,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Repositories | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const {
    autoExpandedIds,
    discoveredFolders,
    discoveredWorktrees,
    isUnpopulated,
    limit,
    page,
    pickerCapabilities,
    rows,
    search,
    showMissing,
    sortBy,
    sortOrder,
    totalCount,
  } = loaderData;

  // Hooks

  // Setup
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const addedFolder =
    actionData && 'addedFolder' in actionData ? actionData.addedFolder : null;
  const refreshed =
    actionData && 'refreshed' in actionData ? actionData.refreshed : null;
  const pruned =
    actionData && 'pruned' in actionData ? actionData.pruned : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <RepositoriesSection
        actionError={actionError}
        addedFolder={addedFolder}
        autoExpandedIds={autoExpandedIds}
        discoveredFolders={discoveredFolders}
        discoveredWorktrees={discoveredWorktrees}
        isUnpopulated={isUnpopulated}
        limit={limit}
        page={page}
        pickerCapabilities={pickerCapabilities}
        pruned={pruned}
        refreshed={refreshed}
        rows={rows}
        search={search}
        showMissing={showMissing}
        sortBy={sortBy}
        sortOrder={sortOrder}
        totalCount={totalCount}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'addFolder':
      return addFolder(args, formData);
    case 'browseDirectory':
      return browseDirectory(args, formData);
    case 'cloneRepo':
      return cloneRepo(args, formData);
    case 'deleteRepo':
      return deleteRepo(args, formData);
    case 'pickFolderNative':
      return pickFolderNative(args);
    case PRUNE_WORKTREE_CHECKOUTS_INTENT:
      return pruneWorktreeCheckouts(args, formData);
    case 'refreshCheckout':
      return refreshCheckout(args, formData);

    default:
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
