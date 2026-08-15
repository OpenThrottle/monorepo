import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
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

  return {
    discoveredFolders: data.discoveredFolders,
    pickerCapabilities: data.workspacePickerCapabilities,
    repositories: data.workspaceRepositories,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Repositories | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { discoveredFolders, pickerCapabilities, repositories } = loaderData;

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
        discoveredFolders={discoveredFolders}
        pickerCapabilities={pickerCapabilities}
        refreshed={refreshed}
        repositories={repositories}
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
