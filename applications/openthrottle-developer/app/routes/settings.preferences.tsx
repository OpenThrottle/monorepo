import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/settings.preferences';
import {
  SettingsPreferencesEnabledEditorsDocument,
  SettingsUserPreferencesDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { loadAgentClis } from '~/routing/home/utils/models.server';
import {
  clearDefaultAgent,
  saveDefaultAgent,
  saveDefaultEditor,
} from '~/routing/settings/actions/preferences';
import { SettingsPreferencesAgentSection } from '~/routing/settings/components/SettingsPreferencesAgentSection';
import { SettingsPreferencesEditorSection } from '~/routing/settings/components/SettingsPreferencesEditorSection';
import { SettingsPreferencesIntro } from '~/routing/settings/components/SettingsPreferencesIntro';
import { PREFERENCES_INTENTS } from '~/routing/settings/data/data.preferences';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Preferences',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  // The enabled-editors probe only feeds an advisory warning, so its failure
  // degrades to "no warning" rather than taking the page down. Agent discovery
  // already degrades to an empty list on its own.
  const [preferences, workspace, models] = await Promise.all([
    executeGraphqlWithAuth(args.request, SettingsUserPreferencesDocument),
    executeGraphqlWithAuth(
      args.request,
      SettingsPreferencesEnabledEditorsDocument,
    ).catch(() => null),
    loadAgentClis(args.request),
  ]);

  return {
    enabledEditors: workspace?.workspaceSettings.profile.enabledEditors ?? null,
    models,
    preferences: preferences.userPreferences,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Preferences | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { enabledEditors, models, preferences } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SettingsPreferencesIntro />

      <div className="space-y-10">
        <SettingsPreferencesEditorSection
          defaultEditor={preferences.defaultEditor ?? null}
          enabledEditors={enabledEditors}
        />
        <SettingsPreferencesAgentSection
          defaultAgent={preferences.defaultAgent}
          models={models}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case PREFERENCES_INTENTS.saveDefaultEditor:
      return saveDefaultEditor(args, formData);
    case PREFERENCES_INTENTS.saveDefaultAgent:
      return saveDefaultAgent(args, formData);
    case PREFERENCES_INTENTS.clearDefaultAgent:
      return clearDefaultAgent(args);
    default:
      throw new Error('Invalid intent');
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
