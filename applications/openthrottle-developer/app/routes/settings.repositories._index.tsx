import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GetSettingsRepositoriesDocument } from '~/__generated__/graphql';
import { RepositoriesSection } from '~/routing/settings/repositories/components/RepositoriesSection';
import {
  addFolder,
  browseDirectory,
  cloneRepo,
  deleteRepo,
  pickFolderNative,
  refreshCheckout,
} from '~/routing/settings/repositories/actions/repositories';
import {
  REPOSITORIES_DEFAULT_LIMIT,
  REPOSITORIES_DEFAULT_SORT_BY,
  REPOSITORIES_DEFAULT_SORT_ORDER,
  isRepositoriesSortBy,
  isRepositoriesSortOrder,
} from '~/routing/settings/repositories/config/repositories.defaults';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';
import { filterRepositoryRows } from '~/routing/settings/repositories/utils/search';
import { sortRepositoryRows } from '~/routing/settings/repositories/utils/sorting';
import type { Route } from '@/app/routes/+types/settings.repositories._index';

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
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(
    1,
    Math.min(
      100,
      Number(url.searchParams.get('limit')) || REPOSITORIES_DEFAULT_LIMIT,
    ),
  );
  const search = readSearchParam(url.searchParams);

  const sortByParam = url.searchParams.get('sortBy') ?? '';
  const sortOrderParam = url.searchParams.get('sortOrder') ?? '';
  const sortBy = isRepositoriesSortBy(sortByParam)
    ? sortByParam
    : REPOSITORIES_DEFAULT_SORT_BY;
  const sortOrder = isRepositoriesSortOrder(sortOrderParam)
    ? sortOrderParam
    : REPOSITORIES_DEFAULT_SORT_ORDER;

  const allRows = buildRepositoryRows(data.workspaceRepositories);
  const { autoExpandedIds, rows: filtered } = filterRepositoryRows(
    allRows,
    search,
  );
  const sorted = sortRepositoryRows(filtered, sortBy, sortOrder);

  // Paging counts PARENT rows only: a parent always carries its worktree
  // children with it, so a group is never split across a page boundary.
  const totalCount = sorted.length;
  const start = (page - 1) * limit;
  const rows = sorted.slice(start, start + limit);

  return {
    autoExpandedIds,
    discoveredFolders: data.discoveredFolders,
    isUnpopulated: allRows.length === 0,
    limit,
    page,
    pickerCapabilities: data.workspacePickerCapabilities,
    rows,
    search,
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
    isUnpopulated,
    limit,
    page,
    pickerCapabilities,
    rows,
    search,
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
        isUnpopulated={isUnpopulated}
        limit={limit}
        page={page}
        pickerCapabilities={pickerCapabilities}
        refreshed={refreshed}
        rows={rows}
        search={search}
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
    case 'refreshCheckout':
      return refreshCheckout(args, formData);

    default:
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
