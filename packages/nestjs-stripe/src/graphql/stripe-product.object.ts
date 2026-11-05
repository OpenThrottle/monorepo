/**
 * @description GraphQL representation of a Stripe {@link https://stripe.com/docs/api/products Product}.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import Stripe from 'stripe';

import { resolveDefaultPriceId } from '../utils/stripe-default-price.utils.ts';
import { StripePriceObject, stripePriceToGql } from './stripe-price.object.ts';

@ObjectType({ description: `Stripe catalog product.` })
export class StripeProductObject {
  @Field(() => Boolean)
  active!: boolean;

  @Field(() => String, {
    description: `Default Stripe Price ID when set on the product.`,
    nullable: true,
  })
  defaultPriceId!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => [String])
  images!: string[];

  @Field(() => String)
  name!: string;

  @Field(() => [StripePriceObject], {
    description: `Active prices for this product. Populated by resolvers that batch-fetch prices to avoid N+1 queries.`,
  })
  prices!: StripePriceObject[];
}

/**
 * @description Maps a Stripe API product to {@link StripeProductObject}.
 *
 * Pass `prices` when they were batch-loaded (e.g. {@link StripeProductsService.listActivePricesForProducts}) so {@link StripeProductResolver} can return them without extra Stripe calls.
 */
export const stripeProductToGql = (
  product: Stripe.Product,
  options?: { readonly prices?: readonly Stripe.Price[] },
): StripeProductObject => {
  const defaultPriceId = resolveDefaultPriceId(product.default_price);

  const prices = (options?.prices ?? []).map((p) => stripePriceToGql(p));

  return {
    active: product.active,
    defaultPriceId,
    description: product.description ?? null,
    id: product.id,
    images: [...(product.images ?? [])],
    name: product.name,
    prices,
  };
};
