/* eslint-disable @typescript-eslint/consistent-type-assertions -- Stripe SDK mocks and event fixtures */
import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type { StripeSubscriptionsPort } from '../tokens/stripe-ports';
import { STRIPE_SUBSCRIPTIONS_PORT } from '../tokens/stripe-tokens';
import { StripeWebhookHandlerService } from './stripe-webhook-handler.service';

const constructEventMock = vi.fn();
const subscriptionsRetrieveMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent: (
          body: Buffer,
          sig: string,
          secret: string,
        ): Stripe.Event =>
          constructEventMock(body, sig, secret) as Stripe.Event,
      };

      subscriptions = {
        retrieve: (id: string) => subscriptionsRetrieveMock(id),
      };
    },
  };
});

describe('StripeWebhookHandlerService', () => {
  const originalEnv = process.env;
  let service: StripeWebhookHandlerService;
  let subscriptions: StripeSubscriptionsPort;
  const findByStripeSubscriptionId = vi.fn();
  const update = vi.fn();
  const upsertByStripeSubscriptionId = vi.fn();

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    constructEventMock.mockReset();
    subscriptionsRetrieveMock.mockReset();
    findByStripeSubscriptionId.mockReset();
    update.mockReset();
    upsertByStripeSubscriptionId.mockReset();

    subscriptions = {
      findByStripeSubscriptionId,
      update,
      upsertByStripeSubscriptionId,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookHandlerService,
        {
          provide: STRIPE_SUBSCRIPTIONS_PORT,
          useValue: subscriptions,
        },
      ],
    }).compile();

    service = module.get(StripeWebhookHandlerService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when raw body is not a Buffer', async () => {
    await expect(
      service.handleRawStripeWebhook(undefined, 'sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when signature is missing', async () => {
    await expect(
      service.handleRawStripeWebhook(Buffer.from('{}'), undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await expect(
      service.handleRawStripeWebhook(Buffer.from('{}'), 'sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when signature verification fails', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('bad sig');
    });

    await expect(
      service.handleRawStripeWebhook(Buffer.from('{}'), 'sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('acknowledges unhandled event types without calling subscriptions', async () => {
    constructEventMock.mockReturnValue({
      data: { object: {} },
      type: 'invoice.paid',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('handles checkout.session.completed by upserting from retrieved subscription', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          client_reference_id: 'user-1',
          customer: 'cus_1',
          metadata: {},
          subscription: 'sub_1',
        },
      },
      type: 'checkout.session.completed',
    });

    subscriptionsRetrieveMock.mockResolvedValue({
      cancel_at_period_end: false,
      current_period_end: 1_700_000_000,
      current_period_start: 1_699_000_000,
      customer: 'cus_1',
      id: 'sub_1',
      items: { data: [{ price: { id: 'price_1' } }] },
      status: 'active',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_1');
    expect(upsertByStripeSubscriptionId).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({
        stripePriceId: 'price_1',
        userId: 'user-1',
      }),
    );
  });

  it('handles customer.subscription.updated by upserting', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: false,
          current_period_end: 1_700_000_000,
          current_period_start: 1_699_000_000,
          customer: 'cus_1',
          id: 'sub_1',
          items: { data: [{ price: { id: 'price_1' } }] },
          metadata: { user_id: 'user-2' },
          status: 'active',
        },
      },
      type: 'customer.subscription.updated',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(upsertByStripeSubscriptionId).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({
        userId: 'user-2',
      }),
    );
  });

  it('handles customer.subscription.deleted by updating existing record', async () => {
    findByStripeSubscriptionId.mockResolvedValue({
      id: 'row-1',
      userId: 'user-1',
    });

    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: true,
          current_period_end: 1_700_000_000,
          customer: 'cus_1',
          id: 'sub_1',
          items: { data: [] },
          status: 'canceled',
        },
      },
      type: 'customer.subscription.deleted',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(update).toHaveBeenCalledWith('row-1', {
      currentPeriodEnd: expect.any(Date),
      status: 'canceled',
    });
  });
});
