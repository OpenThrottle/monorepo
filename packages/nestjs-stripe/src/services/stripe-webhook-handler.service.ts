/**
 * @description Verifies Stripe webhook signatures and updates subscription state via {@link StripeSubscriptionsPort}. Idempotent handlers.
 */

/* eslint-disable @typescript-eslint/consistent-type-assertions -- Stripe verifies payloads; event.data.object is typed loosely in the SDK. */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { getStripeConfig } from '../config/stripe-config';
import type { StripeSubscriptionsPort } from '../tokens/stripe-ports';
import { STRIPE_SUBSCRIPTIONS_PORT } from '../tokens/stripe-tokens';

/** Stripe subscription shape we use (period fields exist on API; types may vary). */
interface StripeSubscriptionPayload {
  cancel_at_period_end: boolean;
  current_period_end?: number;
  current_period_start?: number;
  customer: string;
  id: string;
  items: { data: Array<{ price?: { id?: string } }> };
  metadata?: { user_id?: string };
  status: string;
}

/**
 * @description Result of successfully processing a verified Stripe webhook payload.
 */
export interface StripeWebhookHandleResult {
  readonly received: true;
}

@Injectable()
export class StripeWebhookHandlerService {
  private stripe: Stripe | null = null;

  constructor(
    @Inject(STRIPE_SUBSCRIPTIONS_PORT)
    private readonly subscriptions: StripeSubscriptionsPort,
  ) {}

  private getStripe(): Stripe {
    if (!this.stripe) {
      const { secretKey } = getStripeConfig();
      this.stripe = new Stripe(secretKey);
    }

    return this.stripe;
  }

  /**
   * @description Verifies `rawBody` + `stripe-signature`, dispatches by event type, and returns acknowledgment.
   */
  async handleRawStripeWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<StripeWebhookHandleResult> {
    if (!Buffer.isBuffer(rawBody) || !signature) {
      throw new BadRequestException('Invalid webhook payload or signature');
    }

    const { webhookSecret } = getStripeConfig();
    if (!webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscriptionPayload;
        await this.handleSubscriptionUpsert(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscriptionPayload;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        // Unhandled event type — acknowledge to avoid retries
        break;
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.user_id ?? session.client_reference_id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!userId || !subscriptionId) {
      return;
    }

    const stripe = this.getStripe();
    const sub = (await stripe.subscriptions.retrieve(
      subscriptionId,
    )) as StripeSubscriptionPayload;

    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) return;

    await this.subscriptions.upsertByStripeSubscriptionId(subscriptionId, {
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd:
        sub.current_period_end != null
          ? new Date(sub.current_period_end * 1000)
          : null,
      currentPeriodStart:
        sub.current_period_start != null
          ? new Date(sub.current_period_start * 1000)
          : null,
      status: sub.status,
      stripeCustomerId: customerId ?? null,
      stripePriceId: priceId,
      userId,
    });
  }

  private async handleSubscriptionUpsert(
    subscription: StripeSubscriptionPayload,
  ): Promise<void> {
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) return;

    const userId = await this.resolveUserIdFromSubscription(subscription);
    if (!userId) return;

    await this.subscriptions.upsertByStripeSubscriptionId(subscription.id, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd:
        subscription.current_period_end != null
          ? new Date(subscription.current_period_end * 1000)
          : null,
      currentPeriodStart:
        subscription.current_period_start != null
          ? new Date(subscription.current_period_start * 1000)
          : null,
      status: subscription.status,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : null,
      stripePriceId: priceId,
      userId,
    });
  }

  private async handleSubscriptionDeleted(
    subscription: StripeSubscriptionPayload,
  ): Promise<void> {
    const existing = await this.subscriptions.findByStripeSubscriptionId(
      subscription.id,
    );
    if (existing) {
      await this.subscriptions.update(existing.id, {
        currentPeriodEnd:
          subscription.current_period_end != null
            ? new Date(subscription.current_period_end * 1000)
            : null,
        status: 'canceled',
      });
    }
  }

  /**
   * @description Resolves userId from existing record or subscription metadata. Returns null if unknown (e.g. event before checkout.session.completed).
   */
  private async resolveUserIdFromSubscription(
    subscription: StripeSubscriptionPayload,
  ): Promise<string | null> {
    const existing = await this.subscriptions.findByStripeSubscriptionId(
      subscription.id,
    );
    if (existing) return existing.userId;
    const userId = (subscription.metadata as { user_id?: string } | null)
      ?.user_id;
    return userId ?? null;
  }
}
