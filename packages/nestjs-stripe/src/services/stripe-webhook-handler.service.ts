/**
 * @description Verifies Stripe webhook signatures and updates subscription state via {@link StripeSubscriptionsPort}. Idempotent handlers.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import Stripe from 'stripe';
import {
  createLazyStripeClient,
  getStripeConfig,
} from '../config/stripe-config';
import type {
  StripeProcessedEventsPort,
  StripeSubscriptionsPort,
} from '../tokens/stripe-ports';
import {
  STRIPE_PROCESSED_EVENTS_PORT,
  STRIPE_SUBSCRIPTIONS_PORT,
} from '../tokens/stripe-tokens';

/**
 * Stripe subscription shape we use. As of API version `2026-02-25.clover`, `current_period_start`
 * and `current_period_end` live on each subscription **item** (`items.data[].current_period_*`),
 * not on the subscription root — so we read them from the first item.
 */
interface StripeSubscriptionItemPayload {
  current_period_end?: number;
  current_period_start?: number;
  price?: { id?: string };
}

interface StripeSubscriptionPayload {
  cancel_at_period_end: boolean;
  customer: string;
  id: string;
  items: { data: StripeSubscriptionItemPayload[] };
  metadata?: { user_id?: string };
  status: string;
}

/** Converts a Unix-seconds timestamp to a `Date`, or `null` when absent. */
const toDateOrNull = (unixSeconds: number | undefined): Date | null =>
  unixSeconds != null ? new Date(unixSeconds * 1000) : null;

/**
 * @description Result of successfully processing a verified Stripe webhook payload.
 */
export interface StripeWebhookHandleResult {
  readonly received: true;
}

@Injectable()
export class StripeWebhookHandlerService {
  private readonly logger = new Logger(StripeWebhookHandlerService.name);

  private readonly getStripe = createLazyStripeClient();

  constructor(
    @Inject(STRIPE_SUBSCRIPTIONS_PORT)
    private readonly subscriptions: StripeSubscriptionsPort,
    @Optional()
    @Inject(STRIPE_PROCESSED_EVENTS_PORT)
    private readonly processedEvents: StripeProcessedEventsPort | null = null,
  ) {}

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
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Unknown error';

      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    // Replay protection: Stripe delivers at-least-once and retries on any non-2xx, so dedup on the
    // verified event.id before dispatch. A false result means this id was already recorded
    // (duplicate/replay) — acknowledge without re-running side effects.
    if (this.processedEvents) {
      const isNew = await this.processedEvents.markProcessed(event.id);
      if (!isNew) {
        return { received: true };
      }
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

    const item = sub.items.data[0];
    const priceId = item?.price?.id;
    if (!priceId) return;

    await this.subscriptions.upsertByStripeSubscriptionId(subscriptionId, {
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: toDateOrNull(item?.current_period_end),
      currentPeriodStart: toDateOrNull(item?.current_period_start),
      status: sub.status,
      stripeCustomerId: customerId ?? null,
      stripePriceId: priceId,
      userId,
    });
  }

  private async handleSubscriptionUpsert(
    subscription: StripeSubscriptionPayload,
  ): Promise<void> {
    const item = subscription.items.data[0];
    const priceId = item?.price?.id;
    if (!priceId) return;

    const userId = await this.resolveUserIdFromSubscription(subscription);
    if (!userId) return;

    await this.subscriptions.upsertByStripeSubscriptionId(subscription.id, {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: toDateOrNull(item?.current_period_end),
      currentPeriodStart: toDateOrNull(item?.current_period_start),
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
    if (!existing) {
      // No local row — a `deleted` event arrived before any `created`/`checkout.completed`
      // (rare delivery ordering). The subscription is already gone upstream, so there is nothing
      // to mark canceled. Acknowledge intentionally; log at debug for traceability.
      this.logger.debug(
        `customer.subscription.deleted for unknown subscription ${subscription.id}; nothing to update`,
      );
      return;
    }

    await this.subscriptions.update(existing.id, {
      currentPeriodEnd: toDateOrNull(
        subscription.items.data[0]?.current_period_end,
      ),
      status: 'canceled',
    });
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
