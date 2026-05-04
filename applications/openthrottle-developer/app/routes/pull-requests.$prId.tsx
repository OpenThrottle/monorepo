import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/pull-requests.$prId';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pull Request Details | ${SITE_TITLE}` }];
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
    <GlobalScreen>
      <OpenThrottleEmptyState
        description="Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis, architecto ea?"
        title="Pull Request Details - Coming Soon"
      />
      <hr className="my-8" />
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
