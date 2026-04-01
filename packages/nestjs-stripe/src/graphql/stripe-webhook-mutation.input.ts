/**
 * @description GraphQL input for {@link StripeWebhookResolver.processStripeWebhook}: raw webhook bytes (base64) plus Stripe-Signature for verification.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ProcessStripeWebhookInput {
  @Field(() => String, {
    description: `Canonical raw request body encoded as standard base64. Must match the bytes Stripe signed.`,
  })
  rawPayloadBase64!: string;

  @Field(() => String, {
    description: `Value of the Stripe-Signature header from the original HTTP request.`,
  })
  stripeSignature!: string;
}
