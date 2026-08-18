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
import { SettingsWorkspaceIntro } from '~/routing/settings/components/SettingsWorkspaceIntro';
import { SettingsWorkspaceProfileForm } from '~/routing/settings/components/SettingsWorkspaceProfileForm';
import {
  applyEditorConfig,
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
    profile: data.workspaceSettings.profile,
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
  const { profile } = loaderData;

  // Hooks

  // Setup
  const actionError = getActionError(actionData) ?? null;
  const actionMessage =
    actionData && 'message' in actionData ? actionData.message : null;
  const canApplyEditors = profile.enabledEditors.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
