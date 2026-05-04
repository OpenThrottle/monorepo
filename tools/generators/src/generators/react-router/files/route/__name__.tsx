import * as React from 'react';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { GlobalLayoutBreadcrumbsHandle, GlobalScreen } from '@openthrottle/react-router-ui-global';
import type { Route } from '@/app/routes/+types/<%= name %>';
// import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => '<%= namePascal %>',
  links: (_match) => [],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `<%= namePascal %> | ${SITE_TITLE}` }];
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
    <GlobalScreen>
      <h1 className="text-xl my-4"><%= namePascal %></h1>
      <p>
      Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facilis,
      architecto ea?
      </p>
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
