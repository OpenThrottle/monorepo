/**
 * @description GraphQL types for payments: subscription (entitlement) and checkout session result.
 */

import type { SubscriptionData } from '@openthrottle/nestjs-repositories';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SubscriptionObject implements SubscriptionData {
  @Field(() => Boolean)
  cancelAtPeriodEnd!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  currentPeriodEnd!: Date | null;

  @Field(() => Date, { nullable: true })
  currentPeriodStart!: Date | null;

  @Field(() => String)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  stripeCustomerId!: string | null;

  @Field(() => String)
  stripePriceId!: string;

  @Field(() => String, { nullable: true })
  stripeSubscriptionId!: string | null;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  userId!: string;
}

@ObjectType()
export class CreateCheckoutSessionPayload {
  @Field(() => String, {
    description: `Redirect URL to Stripe Checkout. Null if user not found or session creation failed.`,
    nullable: true,
  })
  url!: string | null;
}
