/**
 * @description Stripe configuration from environment. Used by checkout and webhook handlers.
 */

export interface StripeConfig {
  readonly secretKey: string;
  readonly webhookSecret: string;
}

/**
 * @description Returns Stripe config from STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
 * Webhook secret is optional at build time; required when handling webhooks.
 */
export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for payments');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';

  return { secretKey, webhookSecret };
}
