import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { SettingsWorkspaceApplyEditors } from '~/routing/settings/components/SettingsWorkspaceApplyEditors';
import { SettingsWorkspaceIntro } from '~/routing/settings/components/SettingsWorkspaceIntro';
import { SettingsWorkspaceProfileForm } from '~/routing/settings/components/SettingsWorkspaceProfileForm';
import { SettingsWorkspaceRepositoriesSection } from '~/routing/settings/components/SettingsWorkspaceRepositoriesSection';
import {
  addFolder,
  applyEditorConfig,
  browseDirectory,
  cloneRepo,
  deleteRepo,
  pickFolderNative,
  refreshCheckout,
  updateProfile,
} from '~/routing/settings/actions/workspace';
import type { Route } from '@/app/routes/+types/settings.workspace._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Workspace',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceSettingsDocument,
  );

  return {
    discoveredFolders: data.discoveredFolders,
    pickerCapabilities: data.workspacePickerCapabilities,
    profile: data.workspaceSettings.profile,
    repositories: data.workspaceRepositories,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Workspace settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { discoveredFolders, pickerCapabilities, profile, repositories } =
    loaderData;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const actionMessage =
    actionData && 'message' in actionData ? actionData.message : null;
  const addedFolder =
    actionData && 'addedFolder' in actionData ? actionData.addedFolder : null;
  const refreshed =
    actionData && 'refreshed' in actionData ? actionData.refreshed : null;
  const canApplyEditors = profile.enabledEditors.length > 0;

  return (
    <GlobalScreen>
      <SettingsWorkspaceIntro />

      <div className="space-y-8">
        <SettingsWorkspaceProfileForm
          actionError={actionError}
          profile={profile}
        />
        <SettingsWorkspaceApplyEditors
          actionError={actionError}
          actionMessage={actionMessage}
          disabled={!canApplyEditors}
        />
        <SettingsWorkspaceRepositoriesSection
          actionError={actionError}
          addedFolder={addedFolder}
          discoveredFolders={discoveredFolders}
          pickerCapabilities={pickerCapabilities}
          refreshed={refreshed}
          repositories={repositories}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'addFolder':
      return addFolder(args, formData);
    case 'applyEditorConfig':
      return applyEditorConfig(args, formData);
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
    case 'updateProfile':
      return updateProfile(args, formData);
    default:
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
