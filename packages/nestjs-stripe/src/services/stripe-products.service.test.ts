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

const { mockPricesList, mockProductsList, mockProductsRetrieve } = vi.hoisted(
  () => ({
    mockPricesList: vi.fn(),
    mockProductsList: vi.fn(),
    mockProductsRetrieve: vi.fn(),
  }),
);

vi.mock('../config/stripe-config', () => ({
  getStripeConfig: () => ({
    secretKey: 'sk_test_mock',
    webhookSecret: 'whsec_mock',
  }),
}));

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

describe('partitionPricesByDefault', () => {
  it('puts matching default_price id in defaultPrice and others in additionalPrices', () => {
    const priceDefault = { id: 'price_def' } as Stripe.Price;
    const priceOther = { id: 'price_other' } as Stripe.Price;
    const product = { default_price: 'price_def' } as Stripe.Product;

    const result = partitionPricesByDefault(product, [
      priceDefault,
      priceOther,
    ]);

    expect(result.defaultPrice).toBe(priceDefault);
    expect(result.additionalPrices).toEqual([priceOther]);
  });

  it('returns null default and all prices as additional when product has no default_price', () => {
    const prices = [{ id: 'p1' }, { id: 'p2' }] as unknown as Stripe.Price[];

    const product = { default_price: null } as unknown as Stripe.Product;

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
    const p = {
      active: true,
      id: 'prod_1',
      name: 'Pro',
    } as unknown as Stripe.Product;

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
    const price = {
      active: true,
      id: 'price_1',
      product: 'prod_1',
    } as unknown as Stripe.Price;
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
    const priceA = { id: 'pa', product: 'prod_a' } as Stripe.Price;
    const priceB = { id: 'pb', product: 'prod_b' } as Stripe.Price;
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
