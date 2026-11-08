import type Stripe from 'stripe';

import { resolveDefaultPriceId } from '../stripe-default-price/stripe-default-price.utils.ts';
import type { PartitionedProductPrices } from './stripe-products.types.ts';
/**
 * @description Splits a list of prices using the product's `default_price` id. Prices not matching the default id go to `additionalPrices`.
 */
export const partitionPricesByDefault = (
  product: Stripe.Product,
  prices: readonly Stripe.Price[],
): PartitionedProductPrices => {
  const defaultId = resolveDefaultPriceId(product.default_price);

  if (defaultId == null) {
    return { additionalPrices: prices, defaultPrice: null };
  }

  const defaultPrice = prices.find((p) => p.id === defaultId) ?? null;
  const additionalPrices = prices.filter((p) => p.id !== defaultId);

  return { additionalPrices, defaultPrice };
};
