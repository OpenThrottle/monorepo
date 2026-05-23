import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { CogIcon } from 'lucide-react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SettingsEnvironmentDiagnostics } from '~/routing/settings/components/SettingsEnvironmentDiagnostics';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/settings._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'General',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = (_args: Route.LoaderArgs) => {
  return getSettingsDiagnosticsLoaderData();
};

export const links: Route.LinksFunction = () => {
  return [];
};

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

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={CogIcon}
          title="Settings"
        />
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Controls for the OpenThrottle Developer portal.
        </p>
      </div>
      <div className="space-y-8">
        <SettingsEnvironmentDiagnostics
          env={loaderData.env}
          idPrefix="settings-general"
          supportBundle={loaderData.supportBundle}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
