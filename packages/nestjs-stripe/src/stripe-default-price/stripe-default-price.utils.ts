import type Stripe from 'stripe';

/**
 * @description Reads the id of a product's `default_price`, which Stripe
 * returns either as an id string or as an expanded price object.
 */
export const resolveDefaultPriceId = (
  defaultPrice: Stripe.Product['default_price'],
): string | null => {
  if (defaultPrice == null) return null;
  if (typeof defaultPrice === 'string') return defaultPrice;
  return defaultPrice.id;
};
