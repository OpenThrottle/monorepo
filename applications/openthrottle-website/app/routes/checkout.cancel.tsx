import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { CheckoutCancelContent } from '~/routing/checkout/components/CheckoutCancelContent';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/checkout.cancel';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Checkout cancelled | ${SITE_TITLE}` }];
});

export default function CheckoutCancel(props: Route.ComponentProps) {
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
      data-testid="CheckoutCancel"
    >
      <CheckoutCancelContent />
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
