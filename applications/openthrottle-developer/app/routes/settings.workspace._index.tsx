import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  GetEditorPresenceDocument,
  GetWorkspaceSettingsDocument,
} from '~/__generated__/graphql';
import { SettingsWorkspaceEditorsForm } from '~/routing/settings/components/SettingsWorkspaceEditorsForm';
import { SettingsWorkspaceIntro } from '~/routing/settings/components/SettingsWorkspaceIntro';
import { SettingsWorkspaceProfileForm } from '~/routing/settings/components/SettingsWorkspaceProfileForm';
import {
  applyEditorConfig,
  updateProfile,
} from '~/routing/settings/actions/workspace';
import { buildEditorPresenceIndex } from '~/routing/settings/utils/workspace-editor-presence-status';
import { buildWorkspaceApplyResults } from '~/routing/settings/utils/workspace-apply-results';
import { buildWorkspaceEditorTargetGroups } from '~/routing/settings/utils/workspace-editor-targets';
import type { Route } from '@/app/routes/+types/settings.workspace._index';
// import { FolderGit2Icon } from 'lucide-react';
// import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
// import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
// import { SettingsWorkspaceApplyEditors } from '~/routing/settings/components/SettingsWorkspaceApplyEditors';
// import { SettingsWorkspaceApplyResults } from '~/routing/settings/components/SettingsWorkspaceApplyResults';
// import { SettingsWorkspaceEditorTargets } from '~/routing/settings/components/SettingsWorkspaceEditorTargets';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Workspace',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  // Two documents, not one. Editor presence is an advisory hint over a host filesystem
  // probe; fetching it separately and swallowing its failure means a probe problem
  // degrades to "no hints" instead of taking the whole settings page down.
  const [data, presence] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetWorkspaceSettingsDocument),
    executeGraphqlWithAuth(args.request, GetEditorPresenceDocument).catch(
      () => null,
    ),
  ]);

  const profile = data.workspaceSettings.profile;
  const localRepositories = data.workspaceSettings.localRepositories;

  return {
    editorPresence: presence?.editorPresence ?? null,
    localRepositories,
    profile,
    targets: buildWorkspaceEditorTargetGroups(
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
  const {
    editorPresence,
    localRepositories,
    profile,
    targets: _targets,
  } = loaderData;

  // Hooks
  // Indexed once here and handed to every surface that shows availability, so the picker,
  // the hints row and the per-repository chips can never disagree about a state.
  const editorPresenceIndex = React.useMemo(
    () => buildEditorPresenceIndex(editorPresence?.editors),
    [editorPresence],
  );

  // Setup
  const actionError = getActionError(actionData) ?? null;
  const _actionMessage =
    actionData && 'message' in actionData ? actionData.message : null;
  const _canApplyEditors = profile.enabledEditors.length > 0;
  const applications =
    actionData && 'applications' in actionData ? actionData.applications : null;
  const _applyResults = applications
    ? buildWorkspaceApplyResults(applications, localRepositories)
    : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <SettingsWorkspaceIntro />

      <div className="space-y-10">
        <div className="space-y-4">
          <SettingsWorkspaceEditorsForm
            actionError={actionError}
            editorPresence={editorPresence}
            editorPresenceIndex={editorPresenceIndex}
            profile={profile}
          />
          {/*
          <OpenThrottleFieldset
            icon={FolderGit2Icon}
            id="settings-workspace-editor-targets"
            legend={WORKSPACE_SETTINGS_COPY.targetsHeading}
          >
            <SettingsWorkspaceEditorTargets
              hasRepositories={localRepositories.length > 0}
              presence={editorPresenceIndex}
              targets={targets}
            />
            <SettingsWorkspaceApplyEditors
              actionError={actionError}
              disabled={!canApplyEditors}
            />
            {applyResults ? (
              <SettingsWorkspaceApplyResults
                className="border-t pt-4"
                results={applyResults}
                summary={actionMessage}
              />
            ) : null}
          </OpenThrottleFieldset>
          */}
        </div>

        {/* Workspace preferences, independent of the apply flow above. */}
        <div className="space-y-4">
          <SettingsWorkspaceProfileForm
            actionError={actionError}
            profile={profile}
          />
        </div>
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
