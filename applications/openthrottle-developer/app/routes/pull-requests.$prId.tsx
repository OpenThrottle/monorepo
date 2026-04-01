import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pull Request Details | ${SITE_TITLE}` }];
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
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <h1 className="text-xl my-4 text-highlight">Pull Request Details</h1>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
        architecto ea?
      </p>
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
