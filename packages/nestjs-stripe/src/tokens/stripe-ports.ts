/**
 * @description App-layer ports for Stripe checkout and webhooks. Wire implementations via {@link StripeModule.forRootAsync}.
 */

/** Payload passed to upsert from webhook handlers. */
export interface StripeSubscriptionUpsertPayload {
  readonly cancelAtPeriodEnd: boolean;
  readonly currentPeriodEnd: Date | null;
  readonly currentPeriodStart: Date | null;
  readonly status: string;
  readonly stripeCustomerId: string | null;
  readonly stripePriceId: string;
  readonly userId: string;
}

/** Partial update from webhook handlers. */
export interface StripeSubscriptionUpdatePayload {
  readonly currentPeriodEnd?: Date | null;
  readonly status?: string;
}

/**
 * @description Minimal subscription persistence API used by Stripe webhooks.
 */
export interface StripeSubscriptionsPort {
  findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<{ readonly id: string; readonly userId: string } | null>;

  update(
    id: string,
    data: StripeSubscriptionUpdatePayload,
  ): Promise<unknown | null>;

  upsertByStripeSubscriptionId(
    stripeSubscriptionId: string,
    data: StripeSubscriptionUpsertPayload,
  ): Promise<unknown>;
}

/**
 * @description User lookup for Checkout (customer email on the session).
 */
export interface StripeCheckoutUserPort {
  findById(id: string): Promise<{ readonly email: string | null } | null>;
}
