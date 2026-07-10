/**
 * @description Tests for {@link StripeProductsService} with mocked Stripe API.
 */

import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  partitionPricesByDefault,
  StripeProductsService,
} from './stripe-products.service';

/** @description Presents a partial structural fixture as the target Stripe type without a cast. */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const { mockPricesList, mockProductsList, mockProductsRetrieve } = vi.hoisted(
  () => ({
    mockPricesList: vi.fn(),
    mockProductsList: vi.fn(),
    mockProductsRetrieve: vi.fn(),
  }),
);

vi.mock('stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('stripe')>();
  const RealStripe = actual.default;

  class MockStripe {
    prices = {
      list: mockPricesList,
    };

    products = {
      list: mockProductsList,
      retrieve: mockProductsRetrieve,
    };
  }

  return {
    default: Object.assign(MockStripe, {
      errors: RealStripe.errors,
    }),
  };
});

vi.mock('../config/stripe-config', async () => {
  const MockStripe = (await import('stripe')).default;

  return {
    createLazyStripeClient: () => {
      const client = new MockStripe('sk_test_mock');
      return () => client;
    },
    createStripeClient: () => new MockStripe('sk_test_mock'),
    getStripeConfig: () => ({
      secretKey: 'sk_test_mock',
      webhookSecret: 'whsec_mock',
    }),
  };
});

describe('partitionPricesByDefault', () => {
  it('puts matching default_price id in defaultPrice and others in additionalPrices', () => {
    const priceDefault = asMock<Stripe.Price>({ id: 'price_def' });
    const priceOther = asMock<Stripe.Price>({ id: 'price_other' });
    const product = asMock<Stripe.Product>({ default_price: 'price_def' });

    const result = partitionPricesByDefault(product, [
      priceDefault,
      priceOther,
    ]);

    expect(result.defaultPrice).toBe(priceDefault);
    expect(result.additionalPrices).toEqual([priceOther]);
  });

  it('returns null default and all prices as additional when product has no default_price', () => {
    const prices = [
      asMock<Stripe.Price>({ id: 'p1' }),
      asMock<Stripe.Price>({ id: 'p2' }),
    ];

    const product = asMock<Stripe.Product>({ default_price: null });

    const result = partitionPricesByDefault(product, prices);

    expect(result.defaultPrice).toBeNull();
    expect(result.additionalPrices).toEqual(prices);
  });
});

describe('StripeProductsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listActiveProducts returns data from stripe.products.list', async () => {
    const p = asMock<Stripe.Product>({
      active: true,
      id: 'prod_1',
      name: 'Pro',
    });

    mockProductsList.mockResolvedValue({ data: [p] });

    const moduleRef = await Test.createTestingModule({
      providers: [StripeProductsService],
    }).compile();
    const service = moduleRef.get(StripeProductsService);

    const result = await service.listActiveProducts();

    expect(mockProductsList).toHaveBeenCalledWith({ active: true, limit: 100 });
    expect(result).toEqual([p]);
  });

  it('listActivePricesForProduct returns data from stripe.prices.list', async () => {
    const price = asMock<Stripe.Price>({
      active: true,
      id: 'price_1',
      product: 'prod_1',
    });
    mockPricesList.mockResolvedValue({ data: [price] });

    const moduleRef = await Test.createTestingModule({
      providers: [StripeProductsService],
    }).compile();
    const service = moduleRef.get(StripeProductsService);

    const result = await service.listActivePricesForProduct('prod_1');

    expect(mockPricesList).toHaveBeenCalledWith({
      active: true,
      limit: 100,
      product: 'prod_1',
    });
    expect(result).toEqual([price]);
  });

  it('listActivePricesForProducts dedupes ids and returns a map per product', async () => {
    const priceA = asMock<Stripe.Price>({ id: 'pa', product: 'prod_a' });
    const priceB = asMock<Stripe.Price>({ id: 'pb', product: 'prod_b' });
    mockPricesList.mockImplementation(async (params: { product: string }) => {
      if (params.product === 'prod_a') {
        return { data: [priceA] };
      }
      if (params.product === 'prod_b') {
        return { data: [priceB] };
      }
      return { data: [] };
    });

    const moduleRef = await Test.createTestingModule({
      providers: [StripeProductsService],
    }).compile();
    const service = moduleRef.get(StripeProductsService);

    const result = await service.listActivePricesForProducts([
      'prod_a',
      'prod_b',
      'prod_a',
    ]);

    expect(mockPricesList).toHaveBeenCalledTimes(2);
    expect(result.get('prod_a')).toEqual([priceA]);
    expect(result.get('prod_b')).toEqual([priceB]);
  });

  it('getProductById returns null on resource_missing', async () => {
    mockProductsRetrieve.mockRejectedValue(
      Object.assign(
        new Stripe.errors.StripeInvalidRequestError({
          message: 'No such product',
          param: 'id',
          type: 'invalid_request_error',
        }),
        { code: 'resource_missing' },
      ),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [StripeProductsService],
    }).compile();
    const service = moduleRef.get(StripeProductsService);

    const result = await service.getProductById('prod_missing');

    expect(result).toBeNull();
  });
});
