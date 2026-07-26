import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  AddWorkspaceFolderDocument,
  ApplyWorkspaceEditorConfigurationDocument,
  BrowseWorkspaceDirectoryDocument,
  DeleteWorkspaceLocalRepositoryDocument,
  GetWorkspaceSettingsDocument,
  RefreshCheckoutDocument,
  SetWorkspaceLocalRepositoryProjectDocument,
  UpdateWorkspaceProfileDocument,
} from '~/__generated__/graphql';
import { SettingsWorkspaceApplyEditors } from '~/routing/settings/components/SettingsWorkspaceApplyEditors';
import { SettingsWorkspaceIntro } from '~/routing/settings/components/SettingsWorkspaceIntro';
import { SettingsWorkspaceProfileForm } from '~/routing/settings/components/SettingsWorkspaceProfileForm';
import { SettingsWorkspaceRepositoriesSection } from '~/routing/settings/components/SettingsWorkspaceRepositoriesSection';
import { formatEditorConfigApplyMessage } from '~/routing/settings/utils/format-editor-config-result';
import {
  optionalTrimmedString,
  parseEnabledEditorsFromFormData,
  parseProjectIdFromFormData,
} from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.workspace';

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
    profile: data.workspaceSettings.profile,
    projects: data.projects,
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
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { discoveredFolders, profile, projects, repositories } = loaderData;
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
          projects={projects}
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

  if (intent === 'updateProfile') {
    const contactDisplayName = optionalTrimmedString(
      formData.get('contactDisplayName'),
    );
    const contactEmail = optionalTrimmedString(formData.get('contactEmail'));
    const enabledEditors = parseEnabledEditorsFromFormData(formData);

    try {
      await executeGraphqlWithAuth(
        args.request,
        UpdateWorkspaceProfileDocument,
        {
          input: {
            contactDisplayName,
            contactEmail,
            enabledEditors,
          },
        },
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile.';
      return { error: message };
    }
  }

  if (intent === 'addFolder') {
    const path = optionalTrimmedString(formData.get('path'));
    const displayName = optionalTrimmedString(formData.get('displayName'));

    if (!path) {
      return { error: 'A folder path is required.' };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        AddWorkspaceFolderDocument,
        { input: { displayName: displayName ?? null, path } },
      );
      return { addedFolder: data.addWorkspaceFolder };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add folder.';
      return { error: message };
    }
  }

  if (intent === 'browseDirectory') {
    const path = optionalTrimmedString(formData.get('path'));
    if (!path) {
      return { error: 'A directory path is required.' };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        BrowseWorkspaceDirectoryDocument,
        { path },
      );
      return { browse: { entries: data.browseDirectory, path } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to browse directory.';
      return { error: message };
    }
  }

  if (intent === 'refreshCheckout') {
    const id = formData.get('id');
    if (typeof id !== 'string' || !id.trim()) {
      return { error: 'Missing checkout id.' };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        RefreshCheckoutDocument,
        { input: { id: id.trim() } },
      );
      return {
        refreshed: {
          checkoutId: data.refreshCheckout.checkout.id,
          drift: data.refreshCheckout.drift,
          merged: data.refreshCheckout.merged,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh checkout.';
      return { error: message };
    }
  }

  if (intent === 'setRepoProject') {
    const id = formData.get('id');
    if (typeof id !== 'string' || !id.trim()) {
      return { error: 'Missing checkout id.' };
    }
    const projectId = parseProjectIdFromFormData(formData.get('projectId'));

    try {
      await executeGraphqlWithAuth(
        args.request,
        SetWorkspaceLocalRepositoryProjectDocument,
        { input: { id: id.trim(), projectId } },
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update the project link.';
      return { error: message };
    }
  }

  if (intent === 'applyEditorConfig') {
    const repositoryId = optionalTrimmedString(formData.get('repositoryId'));

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        ApplyWorkspaceEditorConfigurationDocument,
        {
          input: repositoryId ? { repositoryIds: [repositoryId] } : {},
        },
      );
      return { message: formatEditorConfigApplyMessage(data) };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to apply editor configuration.';
      return { error: message };
    }
  }

  if (intent === 'deleteRepo') {
    const id = formData.get('id');
    if (typeof id !== 'string' || !id.trim()) {
      return { error: 'Missing repository id.' };
    }

    try {
      await executeGraphqlWithAuth(
        args.request,
        DeleteWorkspaceLocalRepositoryDocument,
        { id: id.trim() },
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove repository.';
      return { error: message };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
