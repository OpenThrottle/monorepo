/**
 * @description Creates Stripe Checkout sessions for subscription signup. Hybrid approach: app owns entitlement state; Stripe handles payment UI.
 */
import { Inject, Injectable } from '@nestjs/common';

import { createLazyStripeClient } from '../config/config.utils.ts';
import { STRIPE_CHECKOUT_USER_PORT } from '../tokens/stripe.token.ts';
import type { StripeCheckoutUserPort } from '../tokens/tokens.types.ts';
import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
} from './checkout.types.ts';

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
