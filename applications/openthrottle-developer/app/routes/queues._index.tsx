import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/queues._index';
import { GetQueuesDocument } from '~/__generated__/graphql';
import { QueuesTable } from '~/routing/queues/components/QueuesTable';
import { QueuesToolbar } from '~/routing/queues/components/QueuesToolbar';

export const loader = async (args: Route.LoaderArgs) => {
  const { queues } = await executeGraphqlWithAuth(
    args.request,
    GetQueuesDocument,
  );

  return { queues };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `QueuesIndex | ${SITE_TITLE}` }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Queues | ${SITE_TITLE}` }];
});

export default function Index(props: Route.ComponentProps) {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { queues } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="flex flex-col p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto flex-1">
      <h1 className="text-xl my-4 text-highlight">Queues</h1>
      <QueuesToolbar queues={queues} />
      <div className="flex-1 mt-4">
        <QueuesTable queues={queues} />
      </div>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
