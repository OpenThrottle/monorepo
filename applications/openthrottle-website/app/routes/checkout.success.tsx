import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { CheckoutSuccessContent } from '~/routing/checkout/components/CheckoutSuccessContent';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/checkout.success';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Checkout success | ${SITE_TITLE}` }];
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
    <main
      className="p-12 relative h-full max-w-5xl flex-1 w-full mx-auto"
      data-testid="CheckoutSuccess"
    >
      <CheckoutSuccessContent />
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
