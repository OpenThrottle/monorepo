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

/**
 * @description Idempotency store for verified Stripe webhook event ids. Backs replay protection:
 * Stripe delivers at-least-once and retries on any non-2xx, so the handler records each `event.id`
 * before dispatch and short-circuits duplicates. Implement with a unique-constrained table
 * (insert-if-absent) or Redis `SET NX` with a TTL covering Stripe's retry window.
 */
export interface StripeProcessedEventsPort {
  /**
   * @description Atomically records `eventId` as processed. Returns `true` when this call recorded
   * it (first delivery — caller should dispatch), or `false` when it was already present
   * (duplicate/replay — caller should acknowledge without re-dispatching). Must be race-safe so
   * concurrent retries cannot both observe `true`.
   */
  markProcessed(eventId: string): Promise<boolean>;
}
