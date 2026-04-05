import * as React from 'react';
import { ShouldRevalidateFunction, useSearchParams } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { buildCheckoutPath } from '~/routing/checkout/utils';
import { parseIntervalFromSearchParams } from '~/routing/pricing/utils';
import { PRICING_INTERVAL_PARAM } from '~/routing/pricing/config';
import { PricingCard } from '~/routing/pricing/components/PricingCard';
import { PricingToggle } from '~/routing/pricing/components/PricingToggle';
import type { BillingInterval } from '~/routing/pricing/components/PricingToggle';
import type { Route } from '@/app/routes/+types/pricing._index';
import { GetPricingDocument } from '~/__generated__/graphql';

/**
 * @external https://remix.run/docs/en/main/route/should-revalidate
 * @description We only need to revalidate when we login or logout which
 * is already taken care of by the auth routes. So we don't need to revalidate
 * (refetch) to data at this level.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (_args) => {
  return false;
};

export const loader = async (_args: Route.LoaderArgs) => {
  const { stripeProducts } = await executeGraphql(GetPricingDocument, {});

  return { products: stripeProducts };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Pricing | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const _companyPricingEnabled = false;
  const billingInterval = parseIntervalFromSearchParams(searchParams);
  const isYearly = billingInterval === 'yearly';

  // Handlers
  const handleIntervalChange = React.useCallback(
    (value: BillingInterval) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(PRICING_INTERVAL_PARAM, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="relative h-full">
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/30"
        data-testid="PricingSection"
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-center">Pricing</h1>
          <p className="text-lg text-muted-foreground text-center mb-8 max-w-xl mx-auto">
            Simple, transparent pricing.
            <br className="hidden md:block" />
            Start with a free trial, then choose the plan that fits your team.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {loaderData.products.map((product, index) => (
              <PricingCard
                ctaTo={buildCheckoutPath(product.id, billingInterval)}
                index={index}
                key={product.id}
                product={product}
                yearly={isYearly}
              />
            ))}
          </div>

          <div className="flex justify-center my-12">
            <PricingToggle
              onValueChange={handleIntervalChange}
              value={billingInterval}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
