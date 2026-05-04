import * as React from 'react';
import { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { EventSubscriptionsSection } from '~/routing/settings/components/EventSubscriptionsSection';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { NotificationPreferencesSection } from '~/routing/settings/components/NotificationPreferencesSection';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/settings._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Settings',
  links: (_match) => [],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Settings | ${SITE_TITLE}` }];
});

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
    <main className="p-4 md:p-8">
      <div className="flex gap-8">
        <NotificationPreferencesSection className="flex-1" />
        <EventSubscriptionsSection className="flex-1" />
      </div>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
