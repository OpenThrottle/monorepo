import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SettingsLogsPanel } from '~/routing/settings/components/SettingsLogsPanel';
import type { Route } from '@/app/routes/+types/settings.logs';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Logs',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `SettingsLogs | ${SITE_TITLE}` }];
};

export default function Component(
  _props: Route.ComponentProps,
): React.ReactElement {
  return (
    <GlobalScreen>
      <SettingsLogsPanel />
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
