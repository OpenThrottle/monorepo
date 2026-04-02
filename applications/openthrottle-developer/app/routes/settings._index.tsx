import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { NotificationPreferencesSection } from '~/routing/settings/components/NotificationPreferencesSection';
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

export default function Index(props: Route.ComponentProps) {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="relative h-full p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <h1 className="my-4 text-3xl font-semibold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage notification preferences and event subscriptions for your
            account.
          </p>
        </header>

        <NotificationPreferencesSection />
      </div>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
