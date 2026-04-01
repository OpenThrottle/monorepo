/* eslint-disable @typescript-eslint/consistent-type-assertions -- Stripe fixture shapes */
/**
 * @description Tests for {@link stripePriceToGql}.
 */

import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { stripePriceToGql } from './stripe-price.object';

describe('stripePriceToGql', () => {
  it('maps a one-time price', () => {
    const price = {
      active: true,
      currency: 'usd',
      id: 'price_1',
      object: 'price',
      recurring: null,
      type: 'one_time',
      unit_amount: 9900,
    } as Stripe.Price;

    expect(stripePriceToGql(price)).toEqual({
      active: true,
      currency: 'usd',
      id: 'price_1',
      recurring: null,
      type: 'one_time',
      unitAmount: 9900,
    });
  });

  it('maps a recurring price with interval', () => {
    const price = {
      active: true,
      currency: 'usd',
      id: 'price_2',
      object: 'price',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      type: 'recurring',
      unit_amount: 1000,
    } as Stripe.Price;

    expect(stripePriceToGql(price)).toEqual({
      active: true,
      currency: 'usd',
      id: 'price_2',
      recurring: {
        interval: 'month',
        intervalCount: 1,
      },
      type: 'recurring',
      unitAmount: 1000,
    });
  });

  it('preserves null unit_amount', () => {
    const price = {
      active: true,
      currency: 'usd',
      id: 'price_3',
      object: 'price',
      recurring: null,
      type: 'one_time',
      unit_amount: null,
    } as Stripe.Price;

    expect(stripePriceToGql(price).unitAmount).toBeNull();
  });
});
