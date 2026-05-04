import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/contact._index';

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `ContactIndex | ${SITE_TITLE}` }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Explore | ${SITE_TITLE}` }];
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
    <main className="p-4 md:p-8 relative h-full">
      <h1 className="text-xl my-4">ContactIndex</h1>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
        architecto ea?
      </p>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   const { request } = args;
//   const { searchParams } = new URL(request.url);
//
//   const { headers, supabase } = getSupabaseClient(request);
//
//   return data({}, { headers });
// };

export const ErrorBoundary = GlobalErrorBoundary;
