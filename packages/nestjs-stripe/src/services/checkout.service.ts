/**
 * @description Creates Stripe Checkout sessions for subscription signup. Hybrid approach: app owns entitlement state; Stripe handles payment UI.
 */

import { Inject, Injectable } from '@nestjs/common';
import { createLazyStripeClient } from '../config/stripe-config';
import type { StripeCheckoutUserPort } from '../tokens/stripe-ports';
import { STRIPE_CHECKOUT_USER_PORT } from '../tokens/stripe-tokens';

export interface CreateCheckoutSessionParams {
  readonly cancelUrl: string;
  readonly priceId: string;
  readonly successUrl: string;
  readonly userId: string;
}

export interface CreateCheckoutSessionResult {
  readonly url: string | null;
}

@Injectable()
export class CheckoutService {
  private readonly getStripe = createLazyStripeClient();

  constructor(
    @Inject(STRIPE_CHECKOUT_USER_PORT)
    private readonly checkoutUser: StripeCheckoutUserPort,
  ) {}

  /**
   * @description Creates a Stripe Checkout Session for subscription. Returns redirect URL or null if user not found.
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CreateCheckoutSessionResult> {
    const user = await this.checkoutUser.findById(params.userId);
    if (!user) {
      return { url: null };
    }

    const stripe = this.getStripe();

    const session = await stripe.checkout.sessions.create(
      {
        cancel_url: params.cancelUrl,
        client_reference_id: params.userId,
        customer_email: user.email ?? undefined,
        line_items: [{ price: params.priceId, quantity: 1 }],
        metadata: { user_id: params.userId },
        mode: 'subscription',
        success_url: params.successUrl,
      },
      {
        idempotencyKey: `checkout:${params.userId}:${params.priceId}`,
      },
    );

    const url =
      typeof session.url === 'string' ? session.url : (session.url ?? null);

    return { url };
  }
}
