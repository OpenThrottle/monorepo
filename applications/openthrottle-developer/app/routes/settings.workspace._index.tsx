import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { SettingsWorkspaceApplyEditors } from '~/routing/settings/components/SettingsWorkspaceApplyEditors';
import { SettingsWorkspaceApplyResults } from '~/routing/settings/components/SettingsWorkspaceApplyResults';
import { SettingsWorkspaceEditorTargets } from '~/routing/settings/components/SettingsWorkspaceEditorTargets';
import { SettingsWorkspaceEditorsForm } from '~/routing/settings/components/SettingsWorkspaceEditorsForm';
import { SettingsWorkspaceIntro } from '~/routing/settings/components/SettingsWorkspaceIntro';
import { SettingsWorkspaceProfileForm } from '~/routing/settings/components/SettingsWorkspaceProfileForm';
import { SettingsWorkspaceWorktreeRootForm } from '~/routing/settings/components/SettingsWorkspaceWorktreeRootForm';
import {
  applyEditorConfig,
  updateProfile,
} from '~/routing/settings/actions/workspace';
import { buildWorkspaceApplyResults } from '~/routing/settings/utils/workspace-apply-results';
import { buildWorkspaceEditorTargets } from '~/routing/settings/utils/workspace-editor-targets';
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

  const profile = data.workspaceSettings.profile;
  const localRepositories = data.workspaceSettings.localRepositories;

  return {
    localRepositories,
    profile,
    targets: buildWorkspaceEditorTargets(
      localRepositories,
      profile.enabledEditors,
    ),
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Workspace | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { localRepositories, profile, targets } = loaderData;

  // Hooks

  // Setup
  const actionError = getActionError(actionData) ?? null;
  const actionMessage =
    actionData && 'message' in actionData ? actionData.message : null;
  const canApplyEditors = profile.enabledEditors.length > 0;
  const applications =
    actionData && 'applications' in actionData ? actionData.applications : null;
  const applyResults = applications
    ? buildWorkspaceApplyResults(applications, localRepositories)
    : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <SettingsWorkspaceIntro />

      <div className="space-y-8">
        <SettingsWorkspaceEditorsForm
          actionError={actionError}
          profile={profile}
        />
        <SettingsWorkspaceEditorTargets
          hasRepositories={localRepositories.length > 0}
          targets={targets}
        />
        <SettingsWorkspaceApplyEditors
          actionError={actionError}
          disabled={!canApplyEditors}
        />
        {applyResults ? (
          <SettingsWorkspaceApplyResults
            results={applyResults}
            summary={actionMessage}
          />
        ) : null}
        <SettingsWorkspaceWorktreeRootForm
          actionError={actionError}
          profile={profile}
        />
        <SettingsWorkspaceProfileForm
          actionError={actionError}
          profile={profile}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'applyEditorConfig':
      return applyEditorConfig(args, formData);
    case 'updateProfile':
      return updateProfile(args, formData);
    default:
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
