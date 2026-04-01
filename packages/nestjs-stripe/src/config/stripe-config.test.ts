import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getStripeConfig } from './stripe-config';

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
