/**
 * @description GraphQL representation of a Stripe {@link https://stripe.com/docs/api/prices Price}.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import Stripe from 'stripe';

@ObjectType({
  description: `Recurring billing details when a Stripe price is recurring.`,
})
export class StripePriceRecurringObject {
  @Field(() => String, {
    description: `Billing interval (e.g. month, year).`,
  })
  interval!: string;

  @Field(() => Int, {
    description: `Number of intervals between billings.`,
  })
  intervalCount!: number;
}

@ObjectType({ description: `Stripe price for catalog or checkout.` })
export class StripePriceObject {
  @Field(() => String)
  id!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => String, {
    description: `Three-letter ISO currency code.`,
  })
  currency!: string;

  @Field(() => Int, {
    description: `Unit amount in the smallest currency unit (e.g. cents). Null for some metered or custom schemes.`,
    nullable: true,
  })
  unitAmount!: number | null;

  @Field(() => String, {
    description: `Stripe price type: one_time or recurring.`,
  })
  type!: string;

  @Field(() => StripePriceRecurringObject, {
    description: `Present when type is recurring.`,
    nullable: true,
  })
  recurring!: StripePriceRecurringObject | null;
}

/**
 * @description Maps a Stripe API price to {@link StripePriceObject}.
 */
export const stripePriceToGql = (price: Stripe.Price): StripePriceObject => {
  const recurring =
    price.recurring == null
      ? null
      : {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
        };

  return {
    active: price.active,
    currency: price.currency,
    id: price.id,
    recurring,
    type: price.type,
    unitAmount: price.unit_amount,
  };
};
