/**
 * @description Unit tests for payments resolver: Stripe catalog, checkout, and subscription queries.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import {
  CheckoutService,
  StripeProductsService,
} from '@openthrottle/nestjs-stripe';
import { SubscriptionsService } from '@openthrottle/nestjs-repositories';
import type { Subscription } from '@openthrottle/nestjs-repositories';
import type Stripe from 'stripe';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { PaymentsResolver } from './payments.resolver';

describe('PaymentsResolver', () => {
  let resolver: PaymentsResolver;

  const mockProduct: Stripe.Product = {
    active: true,
    default_price: 'price_1',
    description: 'Pro plan',
    id: 'prod_1',
    images: [],
    name: 'Pro',
  } as Stripe.Product;

  const mockPrice: Stripe.Price = {
    active: true,
    currency: 'usd',
    id: 'price_1',
    recurring: null,
    type: 'one_time',
    unit_amount: 1000,
  } as Stripe.Price;

  const mockSubscription: Subscription = {
    cancelAtPeriodEnd: false,
    createdAt: new Date('2026-02-02T10:00:00.000Z'),
    currentPeriodEnd: new Date('2026-03-02T10:00:00.000Z'),
    currentPeriodStart: new Date('2026-02-02T10:00:00.000Z'),
    id: 'sub-id',
    status: 'active',
    stripeCustomerId: 'cus_1',
    stripePriceId: 'price_1',
    stripeSubscriptionId: 'sub_stripe_1',
    updatedAt: new Date('2026-02-02T10:00:00.000Z'),
    userId: 'user-id',
  } as Subscription;

  const mockCheckoutService = createMock<CheckoutService>({
    createCheckoutSession: vi.fn(),
  });

  const mockStripeProductsService = createMock<StripeProductsService>({
    getProductById: vi.fn(),
    listActivePricesForProducts: vi.fn(),
    listActiveProducts: vi.fn(),
  });

  const mockSubscriptionsService = createMock<SubscriptionsService>({
    findActiveByUserId: vi.fn(),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PaymentsResolver,
        { provide: CheckoutService, useValue: mockCheckoutService },
        { provide: StripeProductsService, useValue: mockStripeProductsService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
      ],
    }).compile();

    resolver = app.get<PaymentsResolver>(PaymentsResolver);
  });

  describe('stripeProducts', () => {
    test('returns mapped products with prices', async () => {
      vi.mocked(
        mockStripeProductsService.listActiveProducts,
      ).mockResolvedValueOnce([mockProduct]);
      vi.mocked(
        mockStripeProductsService.listActivePricesForProducts,
      ).mockResolvedValueOnce(new Map([['prod_1', [mockPrice]]]));

      const result = await resolver.stripeProducts();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        active: true,
        defaultPriceId: 'price_1',
        description: 'Pro plan',
        id: 'prod_1',
        name: 'Pro',
      });
      expect(result[0]?.prices).toEqual([
        expect.objectContaining({ currency: 'usd', id: 'price_1' }),
      ]);
    });
  });

  describe('stripeProduct', () => {
    test('returns null when product is not found', async () => {
      vi.mocked(mockStripeProductsService.getProductById).mockResolvedValueOnce(
        null,
      );

      const result = await resolver.stripeProduct('missing');

      expect(result).toBeNull();
    });

    test('returns mapped product when found', async () => {
      vi.mocked(mockStripeProductsService.getProductById).mockResolvedValueOnce(
        mockProduct,
      );
      vi.mocked(
        mockStripeProductsService.listActivePricesForProducts,
      ).mockResolvedValueOnce(new Map([['prod_1', [mockPrice]]]));

      const result = await resolver.stripeProduct('prod_1');

      expect(result).toMatchObject({
        id: 'prod_1',
        name: 'Pro',
      });
      expect(result?.prices).toHaveLength(1);
    });
  });

  describe('createCheckoutSession', () => {
    test('returns null url when user is not authenticated', async () => {
      const result = await resolver.createCheckoutSession(
        {
          cancelUrl: 'https://example.com/cancel',
          priceId: 'price_1',
          successUrl: 'https://example.com/success',
        },
        { req: {} },
      );

      expect(result).toEqual({ url: null });
      expect(mockCheckoutService.createCheckoutSession).not.toHaveBeenCalled();
    });

    test('returns checkout url for authenticated user', async () => {
      vi.mocked(
        mockCheckoutService.createCheckoutSession,
      ).mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session' });

      const input = {
        cancelUrl: 'https://example.com/cancel',
        priceId: 'price_1',
        successUrl: 'https://example.com/success',
      };

      const result = await resolver.createCheckoutSession(input, {
        req: { user: { sub: 'user-id' } },
      });

      expect(mockCheckoutService.createCheckoutSession).toHaveBeenCalledWith({
        cancelUrl: input.cancelUrl,
        priceId: input.priceId,
        successUrl: input.successUrl,
        userId: 'user-id',
      });
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session' });
    });
  });

  describe('mySubscription', () => {
    test('returns null when user is not authenticated', async () => {
      const result = await resolver.mySubscription({ req: {} });

      expect(result).toBeNull();
      expect(
        mockSubscriptionsService.findActiveByUserId,
      ).not.toHaveBeenCalled();
    });

    test('returns active subscription for authenticated user', async () => {
      vi.mocked(
        mockSubscriptionsService.findActiveByUserId,
      ).mockResolvedValueOnce(mockSubscription);

      const result = await resolver.mySubscription({
        req: { user: { sub: 'user-id' } },
      });

      expect(mockSubscriptionsService.findActiveByUserId).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual(mockSubscription);
    });
  });
});
