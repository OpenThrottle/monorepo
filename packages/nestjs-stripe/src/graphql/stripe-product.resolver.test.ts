import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeProductsService } from '../services/stripe-products.service';
import type { StripePriceObject } from './stripe-price.object';
import { StripeProductResolver } from './stripe-product.resolver';
import type { StripeProductObject } from './stripe-product.object';

describe('StripeProductResolver', () => {
  let resolver: StripeProductResolver;
  const listActivePricesForProduct = vi.fn();

  beforeEach(async () => {
    listActivePricesForProduct.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeProductResolver,
        {
          provide: StripeProductsService,
          useValue: { listActivePricesForProduct },
        },
      ],
    }).compile();

    resolver = module.get(StripeProductResolver);
  });

  it('returns parent prices when already populated (batch catalog path)', async () => {
    const preloaded: StripePriceObject[] = [
      {
        active: true,
        currency: 'usd',
        id: 'price_1',
        recurring: null,
        type: 'one_time',
        unitAmount: 1000,
      },
    ];
    const parent: StripeProductObject = {
      active: true,
      defaultPriceId: 'price_1',
      description: null,
      id: 'prod_1',
      images: [],
      name: 'Test',
      prices: preloaded,
    };

    const result = await resolver.prices(parent);

    expect(result).toEqual(preloaded);
    expect(listActivePricesForProduct).not.toHaveBeenCalled();
  });

  it('loads prices from Stripe when parent has none', async () => {
    const parent: StripeProductObject = {
      active: true,
      defaultPriceId: null,
      description: null,
      id: 'prod_2',
      images: [],
      name: 'Other',
      prices: [],
    };

    listActivePricesForProduct.mockResolvedValue([
      {
        active: true,
        currency: 'usd',
        id: 'price_x',
        recurring: null,
        type: 'one_time',
        unit_amount: 500,
      },
    ]);

    const result = await resolver.prices(parent);

    expect(listActivePricesForProduct).toHaveBeenCalledWith('prod_2');
    expect(result).toEqual([
      expect.objectContaining({
        currency: 'usd',
        id: 'price_x',
        unitAmount: 500,
      }),
    ]);
  });
});
