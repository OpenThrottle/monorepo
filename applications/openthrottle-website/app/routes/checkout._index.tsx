import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphql } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { CheckoutForm } from '~/routing/checkout/components/CheckoutForm';
import { CheckoutSummary } from '~/routing/checkout/components/CheckoutSummary';
import { GetStripeProductsDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/checkout._index';

export const loader = async (args: Route.LoaderArgs) => {
  const params = args.request;

  const searchParams = new URLSearchParams(args.request.url.split('?')[1]);
  const plan = searchParams.get('plan');

  console.log('🟡 params', params);
  console.log('🟡 plan', plan);

  const { stripeProduct } = await executeGraphql(GetStripeProductsDocument, {
    id: 'prod_UAWaF04QWT4dQG',
  });

  return { product: stripeProduct };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Checkout | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { product } = loaderData;

  // Hooks

  // Setup
  console.log('loaderData', loaderData);

  const lineItems = [product].map((product) => {
    const price = product?.prices[0].unitAmount ?? 0;

    return {
      interval: product?.prices[0].recurring?.interval,
      label: product?.name ?? '_unknown_',
      priceCents: price,
    };
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main
      className="p-12 relative h-full max-w-5xl flex-1 w-full mx-auto"
      data-testid="CheckoutIndex"
    >
      <h1 className="text-3xl my-4">Checkout</h1>
      <p className="text-muted-foreground mb-8">Complete your purchase.</p>
      <div className="grid md:grid-cols-2 gap-8">
        <CheckoutForm actionData={actionData} />
        <CheckoutSummary lineItems={lineItems} />
      </div>
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
