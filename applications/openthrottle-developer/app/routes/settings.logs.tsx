import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
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
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <OpenThrottleEmptyState
        description="Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis, architecto ea?"
        title=" Logs - Coming Soon"
      />
      <hr className="my-8" />
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
