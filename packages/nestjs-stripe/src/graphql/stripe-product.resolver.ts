/**
 * @description Field resolvers for {@link StripeProductObject}. Parent queries should pass batch-loaded prices via {@link stripeProductToGql} so list queries avoid N+1 Stripe calls.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { StripeProductsService } from '../services/stripe-products.service';
import { StripePriceObject, stripePriceToGql } from './stripe-price.object';
import { StripeProductObject } from './stripe-product.object';

@Resolver(() => StripeProductObject)
export class StripeProductResolver {
  constructor(private readonly stripeProductsService: StripeProductsService) {}

  @ResolveField(() => [StripePriceObject], {
    description: `Active prices for this product. When the parent was built with preloaded prices (catalog queries), those are returned; otherwise prices are fetched once for this product.`,
  })
  async prices(
    @Parent() parent: StripeProductObject,
  ): Promise<StripePriceObject[]> {
    if (parent.prices.length > 0) {
      return parent.prices;
    }

    const raw = await this.stripeProductsService.listActivePricesForProduct(
      parent.id,
    );

    return raw.map((p) => stripePriceToGql(p));
  }
}
