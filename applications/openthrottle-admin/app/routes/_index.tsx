import * as React from 'react';
import clsx from 'clsx';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import {
  GlobalAnimationMesh,
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => undefined,
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
    <GlobalScreen className="relative isolate flex w-full flex-1 flex-col justify-center p-4 md:p-8 lg:p-12">
      <GlobalAnimationMesh />
      <div
        className={clsx(
          'relative z-10 mx-auto flex h-full w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 transition-opacity duration-700',
        )}
      >
        <OpenThrottleLogo className="mx-auto text-2xl" name={SITE_SUBDOMAIN} />
        <div className="shimmer-border w-full max-w-md">
          <OpenThrottleAuthForm action="/" />
        </div>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
