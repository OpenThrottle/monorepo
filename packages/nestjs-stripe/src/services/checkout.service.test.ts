/**
 * @description Tests for {@link CheckoutService} with mocked Stripe API.
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StripeCheckoutUserPort } from '../tokens/stripe-ports';
import { STRIPE_CHECKOUT_USER_PORT } from '../tokens/stripe-tokens';
import { CheckoutService } from './checkout.service';

const { mockSessionsCreate } = vi.hoisted(() => ({
  mockSessionsCreate: vi.fn(),
}));

vi.mock('stripe', () => {
  class MockStripe {
    checkout = {
      sessions: {
        create: mockSessionsCreate,
      },
    };
  }

  return { default: MockStripe };
});

vi.mock('../config/stripe-config', async () => {
  const Stripe = (await import('stripe')).default;

  return {
    createLazyStripeClient: () => {
      const client = new Stripe('sk_test_mock');
      return () => client;
    },
    createStripeClient: () => new Stripe('sk_test_mock'),
    getStripeConfig: () => ({
      secretKey: 'sk_test_mock',
      webhookSecret: 'whsec_mock',
    }),
  };
});

const createUserPort = (
  email: string | null,
  found: boolean,
): StripeCheckoutUserPort => ({
  findById: vi.fn().mockResolvedValue(found ? { email } : null),
});

const buildService = async (
  checkoutUser: StripeCheckoutUserPort,
): Promise<CheckoutService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CheckoutService,
      { provide: STRIPE_CHECKOUT_USER_PORT, useValue: checkoutUser },
    ],
  }).compile();

  return moduleRef.get(CheckoutService);
};

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes a stable idempotency key derived from userId and priceId', async () => {
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.test/s' });
    const service = await buildService(createUserPort('user@test.dev', true));

    await service.createCheckoutSession({
      cancelUrl: 'https://app.test/cancel',
      priceId: 'price_123',
      successUrl: 'https://app.test/success',
      userId: 'user_42',
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(expect.any(Object), {
      idempotencyKey: 'checkout:user_42:price_123',
    });
  });

  it('returns the session url on success', async () => {
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.test/s' });
    const service = await buildService(createUserPort(null, true));

    const result = await service.createCheckoutSession({
      cancelUrl: 'https://app.test/cancel',
      priceId: 'price_123',
      successUrl: 'https://app.test/success',
      userId: 'user_42',
    });

    expect(result).toEqual({ url: 'https://checkout.test/s' });
  });

  it('returns null url and does not call Stripe when the user is missing', async () => {
    const service = await buildService(createUserPort(null, false));

    const result = await service.createCheckoutSession({
      cancelUrl: 'https://app.test/cancel',
      priceId: 'price_123',
      successUrl: 'https://app.test/success',
      userId: 'user_missing',
    });

    expect(result).toEqual({ url: null });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});
