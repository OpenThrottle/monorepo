import { StripeProductObject } from '~/__generated__/graphql';

/**
 * @description Formats price in cents to display string (e.g. $29.00).
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(cents / 100);
}

/**
 * @description Resolves display price and unit label for a tier and billing interval.
 */
export function getDisplayPrice(
  product: StripeProductObject,
  yearly: boolean,
): { readonly label: string; readonly price: number } {
  const priceYearly = product.prices.find(
    (price) =>
      price.type === 'recurring' && price.recurring?.interval === 'year',
  );

  const priceMonthly = product.prices.find(
    (price) =>
      price.type === 'recurring' && price.recurring?.interval === 'month',
  );

  return {
    label: yearly ? '/yr' : '/mo',
    price: yearly
      ? (priceYearly?.unitAmount ?? 0)
      : (priceMonthly?.unitAmount ?? 0),
  };
}
