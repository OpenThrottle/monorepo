import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  STRIPE_API_VERSION,
  STRIPE_MAX_NETWORK_RETRIES,
  createLazyStripeClient,
  createStripeClient,
  getStripeConfig,
} from './stripe-config';

describe('getStripeConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when STRIPE_SECRET_KEY is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;

    expect(() => getStripeConfig()).toThrow('STRIPE_SECRET_KEY is required');
  });

  it('returns trimmed secret key and empty webhook secret when unset', () => {
    process.env.STRIPE_SECRET_KEY = ' sk_test_123 ';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const config = getStripeConfig();

    expect(config.secretKey).toBe('sk_test_123');
    expect(config.webhookSecret).toBe('');
  });

  it('returns trimmed webhook secret when set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = ' whsec_abc ';

    const config = getStripeConfig();

    expect(config.webhookSecret).toBe('whsec_abc');
  });
});

describe('createStripeClient', () => {
  it('returns a Stripe client', () => {
    const client = createStripeClient({ secretKey: 'sk_test_123' });

    expect(client).toBeInstanceOf(Stripe);
  });

  it('pins to the version the installed SDK types target', () => {
    // Stripe.API_VERSION is the version this SDK release generates types against.
    // Keeping STRIPE_API_VERSION in lock-step guarantees response shapes match the types.
    expect(STRIPE_API_VERSION).toBe(Stripe.API_VERSION);
  });

  it('configures automatic network retries', () => {
    expect(STRIPE_MAX_NETWORK_RETRIES).toBe(2);
    // Smoke-check construction succeeds with the retry option applied; the SDK exposes no
    // public accessor for the configured retry count, so we assert the pinned constant instead.
    expect(createStripeClient({ secretKey: 'sk_test_123' })).toBeInstanceOf(
      Stripe,
    );
  });
});

describe('createLazyStripeClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('lazily builds and reuses a single client instance', () => {
    const getStripe = createLazyStripeClient();

    const first = getStripe();
    const second = getStripe();

    expect(first).toBeInstanceOf(Stripe);
    expect(second).toBe(first);
  });

  it('does not read config until first invocation', () => {
    delete process.env.STRIPE_SECRET_KEY;
    const getStripe = createLazyStripeClient();

    expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is required');
  });
});
