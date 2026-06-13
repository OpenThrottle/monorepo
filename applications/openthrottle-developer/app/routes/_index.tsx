import * as React from 'react';
import { ChatComposer, ChatThread } from '@openthrottle/react-router-chat';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
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
    <GlobalScreen className="flex flex-1 flex-col p-4 md:p-8 lg:p-12">
      {/* <HomeHeroV1 className="my-20 items-center scale-75" /> */}
      {/* <OpenThrottleProductFeatures features={FEATURES} /> */}

      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-center text-2xl">
          What would you like to build today?
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          OpenThrottle is a platform for building applications based on best
          practices for Agentic development.
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <ChatThread emptyStateLabel="" messages={[]} />
        <ChatComposer
          className="border-t-0"
          disabled={false}
          onSubmit={() => {}}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
