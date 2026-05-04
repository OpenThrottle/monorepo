import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/generators.$generatorId';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Generator Details',
  links: (_match) => [{ children: 'Generators', to: '/generators' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Generator Details | ${SITE_TITLE}` }];
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
      <h1 className="text-xl my-4 text-highlight">Generator Details</h1>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
        architecto ea?
      </p>
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
