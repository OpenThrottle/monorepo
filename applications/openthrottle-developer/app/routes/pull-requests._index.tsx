import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Card } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/pull-requests._index';
import { GetPullRequestsDocument } from '~/__generated__/graphql';

export const loader = async (args: Route.LoaderArgs) => {
  const { pulls } = await executeGraphqlWithAuth(
    args.request,
    GetPullRequestsDocument,
  );

  return { pulls };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pull Requests | ${SITE_TITLE}` }];
});

export default function Index(props: Route.ComponentProps) {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { pulls } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <h1 className="text-xl my-4 text-highlight">Pull Requests</h1>
      <div className="grid grid-cols-1 gap-4 lg:gap-8">
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8"> */}
        {pulls.map((pull) => (
          <Card className="p-4 lg:p-8" key={pull.number}>
            <h2>
              {pull.title} #{pull.number}
            </h2>
            <p>
              Created at {formatDate(pull.createdAt, 'MM/dd/yyyy')} - last
              updated {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
