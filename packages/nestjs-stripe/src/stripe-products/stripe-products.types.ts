import type Stripe from 'stripe';

/**
 * @description Active prices for a product split into the catalog default (when present in the list) and any other active prices.
 */
export interface PartitionedProductPrices {
  readonly additionalPrices: readonly Stripe.Price[];
  readonly defaultPrice: Stripe.Price | null;
}
