/**
 * @description Lists and retrieves Stripe {@link https://stripe.com/docs/api/products Products} and {@link https://stripe.com/docs/api/prices Prices} using the configured secret key.
 */

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { getStripeConfig } from '../config/stripe-config';

/**
 * @description Active prices for a product split into the catalog default (when present in the list) and any other active prices.
 */
export interface PartitionedProductPrices {
  readonly additionalPrices: readonly Stripe.Price[];
  readonly defaultPrice: Stripe.Price | null;
}

/**
 * @description Splits a list of prices using the product's `default_price` id. Prices not matching the default id go to `additionalPrices`.
 */
export const partitionPricesByDefault = (
  product: Stripe.Product,
  prices: readonly Stripe.Price[],
): PartitionedProductPrices => {
  const defaultId =
    product.default_price == null
      ? null
      : typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price.id;

  if (defaultId == null) {
    return { additionalPrices: prices, defaultPrice: null };
  }

  const defaultPrice = prices.find((p) => p.id === defaultId) ?? null;
  const additionalPrices = prices.filter((p) => p.id !== defaultId);

  return { additionalPrices, defaultPrice };
};

@Injectable()
export class StripeProductsService {
  private stripe: Stripe | null = null;

  private getStripe(): Stripe {
    if (!this.stripe) {
      const { secretKey } = getStripeConfig();
      this.stripe = new Stripe(secretKey);
    }

    return this.stripe;
  }

  /**
   * @description Active products (paginated list; first page only, up to `limit`).
   */
  async listActiveProducts(options?: {
    readonly limit?: number;
  }): Promise<readonly Stripe.Product[]> {
    const stripe = this.getStripe();
    const list = await stripe.products.list({
      active: true,
      limit: options?.limit ?? 100,
    });

    return list.data;
  }

  /**
   * @description Active prices for a single product (paginated list; first page only, up to `limit`).
   */
  async listActivePricesForProduct(
    productId: string,
    options?: { readonly limit?: number },
  ): Promise<readonly Stripe.Price[]> {
    const stripe = this.getStripe();
    const list = await stripe.prices.list({
      active: true,
      limit: options?.limit ?? 100,
      product: productId,
    });

    return list.data;
  }

  /**
   * @description Fetches active prices for each product id in parallel (deduped). Missing products yield an empty array for that id.
   */
  async listActivePricesForProducts(
    productIds: readonly string[],
    options?: { readonly limit?: number },
  ): Promise<ReadonlyMap<string, readonly Stripe.Price[]>> {
    const unique = [...new Set(productIds)];
    const entries = await Promise.all(
      unique.map(async (id) => {
        const prices = await this.listActivePricesForProduct(id, options);
        return [id, prices] as const;
      }),
    );

    return new Map(entries);
  }

  /**
   * @description Retrieves a product by Stripe ID, or `null` if missing.
   */
  async getProductById(productId: string): Promise<Stripe.Product | null> {
    const stripe = this.getStripe();

    try {
      return await stripe.products.retrieve(productId);
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === 'resource_missing'
      ) {
        return null;
      }

      throw error;
    }
  }
}
