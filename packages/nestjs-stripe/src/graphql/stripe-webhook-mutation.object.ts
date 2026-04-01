/**
 * @description GraphQL payload returned after a verified Stripe webhook is processed.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StripeWebhookProcessedPayload {
  @Field(() => Boolean, {
    description: `True when the webhook was verified and handled (including ignored event types).`,
  })
  received!: boolean;
}
