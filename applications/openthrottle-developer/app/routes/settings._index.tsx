import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { EventSubscriptionsSection } from '~/routing/settings/components/EventSubscriptionsSection';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { NotificationPreferencesSection } from '~/routing/settings/components/NotificationPreferencesSection';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/settings._index';

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `SettingsIndex | ${SITE_TITLE}` }];
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
    <main className="p-4 md:p-8 relative h-full max-w-7xl mx-auto w-full">
      <OpenThrottleBreadcrumbs
        children="Settings"
        className="mb-4"
        links={[{ children: 'Dashboard', to: '/dashboard' }]}
      />

      <div className="mx-auto max-w-7xl space-y-8">
        {/* <header>
          <h1 className="my-4 text-3xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage notification preferences and event subscriptions for your
            account.
          </p>
        </header> */}

        <div className="flex gap-8">
          <div className="flex flex-col gap-4">
            <NotificationPreferencesSection />
            <EventSubscriptionsSection />
          </div>
          <div className="flex-0 min-w-1/3">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus,
              ducimus ipsum ab in dolores eos amet? Repellendus repellat
              praesentium eveniet fugit ullam obcaecati numquam fugiat, rerum
              unde doloribus nihil quam?
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
