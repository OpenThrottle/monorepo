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
  ApplyWorkspaceEditorConfigurationDocument,
  CreateWorkspaceLocalRepositoryDocument,
  DeleteWorkspaceLocalRepositoryDocument,
  GetWorkspaceSettingsDocument,
  UpdateWorkspaceLocalRepositoryDocument,
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
    localRepositories: data.workspaceSettings.localRepositories,
    profile: data.workspaceSettings.profile,
    projects: data.projects,
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
  const { localRepositories, profile, projects } = loaderData;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const actionMessage =
    actionData && 'message' in actionData ? actionData.message : null;
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
          localRepositories={localRepositories}
          projects={projects}
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

  if (intent === 'createRepo') {
    const displayName = optionalTrimmedString(formData.get('displayName'));
    const filesystemPath = optionalTrimmedString(
      formData.get('filesystemPath'),
    );
    const projectId = parseProjectIdFromFormData(formData.get('projectId'));

    if (!displayName) {
      return { error: 'Repository label is required.' };
    }
    if (!filesystemPath) {
      return { error: 'Absolute path is required.' };
    }

    try {
      await executeGraphqlWithAuth(
        args.request,
        CreateWorkspaceLocalRepositoryDocument,
        {
          input: {
            displayName,
            filesystemPath,
            projectId: projectId ?? null,
          },
        },
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add repository.';
      return { error: message };
    }
  }

  if (intent === 'updateRepo') {
    const id = formData.get('id');
    if (typeof id !== 'string' || !id.trim()) {
      return { error: 'Missing repository id.' };
    }

    const displayName = optionalTrimmedString(formData.get('displayName'));
    const projectId = parseProjectIdFromFormData(formData.get('projectId'));

    if (!displayName) {
      return { error: 'Repository label is required.' };
    }

    try {
      await executeGraphqlWithAuth(
        args.request,
        UpdateWorkspaceLocalRepositoryDocument,
        {
          input: {
            displayName,
            id: id.trim(),
            projectId,
          },
        },
      );
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update repository.';
      return { error: message };
    }
  }

  if (intent === 'applyEditorConfig') {
    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        ApplyWorkspaceEditorConfigurationDocument,
        { input: {} },
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
