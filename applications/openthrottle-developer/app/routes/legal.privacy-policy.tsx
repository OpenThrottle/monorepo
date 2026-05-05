import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.privacy-policy';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Privacy policy',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Privacy policy | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  return (
    <GlobalScreen>
      <h1 className="my-4 text-xl">Privacy policy</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Privacy policy content will be published here.
      </p>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
