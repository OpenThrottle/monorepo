import * as React from 'react';
import { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import type { Route } from '@/app/routes/+types/settings.appearance';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Appearance',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `SettingsAppearance | ${SITE_TITLE}` }];
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
    <main className="p-12 relative h-full">
      <h1 className="text-xl my-4">Appearance</h1>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
        architecto ea?
      </p>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
