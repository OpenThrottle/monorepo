/**
 * @description Stripe configuration from environment. Used by checkout and webhook handlers.
 */
import Stripe from 'stripe';

import {
  STRIPE_API_VERSION,
  STRIPE_MAX_NETWORK_RETRIES,
} from './config.constants.ts';
import type { StripeConfig } from './config.types.ts';

/**
 * @public
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
