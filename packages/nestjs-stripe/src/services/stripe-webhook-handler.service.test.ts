import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type {
  StripeProcessedEventsPort,
  StripeSubscriptionsPort,
} from '../tokens/stripe-ports';
import {
  STRIPE_PROCESSED_EVENTS_PORT,
  STRIPE_SUBSCRIPTIONS_PORT,
} from '../tokens/stripe-tokens';
import { StripeWebhookHandlerService } from './stripe-webhook-handler.service';

/** @description Presents a structural test double as the target type without a cast. */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const constructEventMock =
  vi.fn<(body: Buffer, sig: string, secret: string) => unknown>();
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
          asMock<Stripe.Event>(constructEventMock(body, sig, secret)),
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
  let processedEvents: StripeProcessedEventsPort;
  const findByStripeSubscriptionId = vi.fn();
  const update = vi.fn();
  const upsertByStripeSubscriptionId = vi.fn();
  const markProcessed = vi.fn();

  const buildService = async (
    withProcessedEvents: boolean,
  ): Promise<StripeWebhookHandlerService> => {
    const providers: Parameters<
      typeof Test.createTestingModule
    >[0]['providers'] = [
      StripeWebhookHandlerService,
      {
        provide: STRIPE_SUBSCRIPTIONS_PORT,
        useValue: subscriptions,
      },
    ];

    if (withProcessedEvents) {
      providers.push({
        provide: STRIPE_PROCESSED_EVENTS_PORT,
        useValue: processedEvents,
      });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    return module.get(StripeWebhookHandlerService);
  };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    constructEventMock.mockReset();
    subscriptionsRetrieveMock.mockReset();
    findByStripeSubscriptionId.mockReset();
    update.mockReset();
    upsertByStripeSubscriptionId.mockReset();
    markProcessed.mockReset();
    markProcessed.mockResolvedValue(true);

    subscriptions = {
      findByStripeSubscriptionId,
      update,
      upsertByStripeSubscriptionId,
    };
    processedEvents = { markProcessed };

    service = await buildService(false);
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
      customer: 'cus_1',
      id: 'sub_1',
      items: {
        data: [
          {
            current_period_end: 1_700_000_000,
            current_period_start: 1_699_000_000,
            price: { id: 'price_1' },
          },
        ],
      },
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
        currentPeriodEnd: new Date(1_700_000_000 * 1000),
        currentPeriodStart: new Date(1_699_000_000 * 1000),
        stripePriceId: 'price_1',
        userId: 'user-1',
      }),
    );
  });

  it('acknowledges checkout.session.completed without upserting when userId is missing', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          client_reference_id: null,
          customer: 'cus_1',
          metadata: {},
          subscription: 'sub_1',
        },
      },
      type: 'checkout.session.completed',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled();
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('acknowledges checkout.session.completed without upserting when subscriptionId is missing', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          client_reference_id: 'user-1',
          customer: 'cus_1',
          metadata: {},
          subscription: null,
        },
      },
      type: 'checkout.session.completed',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled();
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('acknowledges checkout.session.completed without upserting when the retrieved subscription has no priceId', async () => {
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
      customer: 'cus_1',
      id: 'sub_1',
      items: {
        data: [
          {
            current_period_end: 1_700_000_000,
            current_period_start: 1_699_000_000,
            price: {},
          },
        ],
      },
      status: 'active',
    });

    const result = await service.handleRawStripeWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_1');
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('acknowledges customer.subscription.updated without upserting when priceId is missing', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: false,
          customer: 'cus_1',
          id: 'sub_1',
          items: { data: [{ current_period_end: 1_700_000_000, price: {} }] },
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
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('acknowledges customer.subscription.updated without upserting when userId cannot be resolved', async () => {
    findByStripeSubscriptionId.mockResolvedValue(null);
    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: false,
          customer: 'cus_1',
          id: 'sub_1',
          items: {
            data: [
              {
                current_period_end: 1_700_000_000,
                current_period_start: 1_699_000_000,
                price: { id: 'price_1' },
              },
            ],
          },
          metadata: {},
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
    expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
  });

  it('handles customer.subscription.updated by upserting', async () => {
    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: false,
          customer: 'cus_1',
          id: 'sub_1',
          items: {
            data: [
              {
                current_period_end: 1_700_000_000,
                current_period_start: 1_699_000_000,
                price: { id: 'price_1' },
              },
            ],
          },
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
        currentPeriodEnd: new Date(1_700_000_000 * 1000),
        currentPeriodStart: new Date(1_699_000_000 * 1000),
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
          customer: 'cus_1',
          id: 'sub_1',
          items: { data: [{ current_period_end: 1_700_000_000 }] },
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
      currentPeriodEnd: new Date(1_700_000_000 * 1000),
      status: 'canceled',
    });
  });

  it('acknowledges customer.subscription.deleted for an unknown subscription without updating', async () => {
    findByStripeSubscriptionId.mockResolvedValue(null);

    constructEventMock.mockReturnValue({
      data: {
        object: {
          cancel_at_period_end: true,
          customer: 'cus_1',
          id: 'sub_unknown',
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
    expect(findByStripeSubscriptionId).toHaveBeenCalledWith('sub_unknown');
    expect(update).not.toHaveBeenCalled();
  });

  describe('replay protection', () => {
    const subscriptionUpdatedEvent = {
      data: {
        object: {
          cancel_at_period_end: false,
          customer: 'cus_1',
          id: 'sub_1',
          items: {
            data: [
              {
                current_period_end: 1_700_000_000,
                current_period_start: 1_699_000_000,
                price: { id: 'price_1' },
              },
            ],
          },
          metadata: { user_id: 'user-2' },
          status: 'active',
        },
      },
      id: 'evt_1',
      type: 'customer.subscription.updated',
    };

    it('records the event id before dispatching on first delivery', async () => {
      service = await buildService(true);
      constructEventMock.mockReturnValue(subscriptionUpdatedEvent);

      const result = await service.handleRawStripeWebhook(
        Buffer.from('{}'),
        'sig',
      );

      expect(result).toEqual({ received: true });
      expect(markProcessed).toHaveBeenCalledWith('evt_1');
      expect(upsertByStripeSubscriptionId).toHaveBeenCalledTimes(1);
    });

    it('short-circuits a duplicate without re-dispatching', async () => {
      service = await buildService(true);
      markProcessed.mockResolvedValue(false);
      constructEventMock.mockReturnValue(subscriptionUpdatedEvent);

      const result = await service.handleRawStripeWebhook(
        Buffer.from('{}'),
        'sig',
      );

      expect(result).toEqual({ received: true });
      expect(markProcessed).toHaveBeenCalledWith('evt_1');
      expect(upsertByStripeSubscriptionId).not.toHaveBeenCalled();
    });

    it('dispatches normally when no processed-events port is wired', async () => {
      constructEventMock.mockReturnValue(subscriptionUpdatedEvent);

      const result = await service.handleRawStripeWebhook(
        Buffer.from('{}'),
        'sig',
      );

      expect(result).toEqual({ received: true });
      expect(markProcessed).not.toHaveBeenCalled();
      expect(upsertByStripeSubscriptionId).toHaveBeenCalledTimes(1);
    });
  });
});
