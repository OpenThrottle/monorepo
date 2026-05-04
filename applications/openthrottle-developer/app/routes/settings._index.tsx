import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { EventSubscriptionsSection } from '~/routing/settings/components/EventSubscriptionsSection';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { NotificationPreferencesSection } from '~/routing/settings/components/NotificationPreferencesSection';
import { SettingsEnvironmentDiagnostics } from '~/routing/settings/components/SettingsEnvironmentDiagnostics';
import { SITE_TITLE } from '~/global/config/settings';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import type { Route } from '@/app/routes/+types/settings._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Settings',
  links: (_match) => [],
};

export const loader = (_args: Route.LoaderArgs) => {
  return getSettingsDiagnosticsLoaderData();
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (!loaderData) {
    return (
      <GlobalScreen>
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <div className="space-y-8">
        <SettingsEnvironmentDiagnostics
          className="max-w-4xl"
          env={loaderData.env}
          idPrefix="settings-general"
          supportBundle={loaderData.supportBundle}
        />
        <div className="flex gap-8">
          <NotificationPreferencesSection className="flex-1" />
          <EventSubscriptionsSection className="flex-1" />
        </div>
      </div>
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
