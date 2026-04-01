/**
 * @description GraphQL input for creating a Stripe Checkout session.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCheckoutSessionInput {
  @Field(() => String, {
    description: `URL to redirect to if the user cancels checkout.`,
  })
  cancelUrl!: string;

  @Field(() => String, {
    description: `Stripe Price ID (e.g. price_xxx) for the subscription.`,
  })
  priceId!: string;

  @Field(() => String, {
    description: `URL to redirect to after successful payment.`,
  })
  successUrl!: string;
}
