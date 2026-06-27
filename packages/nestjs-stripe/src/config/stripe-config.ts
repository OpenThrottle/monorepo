/**
 * @description Stripe configuration from environment. Used by checkout and webhook handlers.
 */

import Stripe from 'stripe';

export interface StripeConfig {
  readonly secretKey: string;
  readonly webhookSecret: string;
}

/**
 * @publicApi
 * @description Pinned Stripe API version. Decouples response shapes from the account's
 * dashboard default so a Stripe-side default bump cannot silently change payload structure.
 * Matches the version the installed `stripe` SDK types are generated against.
 */
export const STRIPE_API_VERSION = '2026-02-25.clover' as const;

/**
 * @description Automatic retries for transient network errors (timeouts, connection resets) on
 * idempotent requests. Without this, a single flaky connection surfaces as a hard failure
 * (checkout 500, or a webhook 4xx that makes Stripe re-deliver the whole event).
 */
export const STRIPE_MAX_NETWORK_RETRIES = 2 as const;

/**
 * @publicApi
 * @description Builds a Stripe client pinned to {@link STRIPE_API_VERSION} with
 * {@link STRIPE_MAX_NETWORK_RETRIES} automatic network retries. Single place where the SDK is
 * instantiated so all call sites share one pinned version and retry policy.
 */
export function createStripeClient(
  config: Pick<StripeConfig, 'secretKey'>,
): Stripe {
  return new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
  });
}

/**
 * @description Builds a lazy accessor for a single shared {@link createStripeClient} instance.
 * The client is constructed on first call (so config is read at request time, not at module load)
 * and reused thereafter. Replaces the per-service `private stripe` + `getStripe()` duplication.
 */
export function createLazyStripeClient(): () => Stripe {
  let client: Stripe | null = null;

  return () => {
    if (!client) {
      const { secretKey } = getStripeConfig();
      client = createStripeClient({ secretKey });
    }

    return client;
  };
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
