import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeWebhookHandlerService } from '../services/stripe-webhook-handler.service';
import { WebhooksController } from './webhooks.controller';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  const handleRawStripeWebhook = vi.fn();

  beforeEach(async () => {
    handleRawStripeWebhook.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: StripeWebhookHandlerService,
          useValue: { handleRawStripeWebhook },
        },
      ],
    }).compile();

    controller = module.get(WebhooksController);
  });

  it('passes req.rawBody and Stripe-Signature to StripeWebhookHandlerService', async () => {
    const rawBody = Buffer.from('{"type":"ping"}');
    handleRawStripeWebhook.mockResolvedValue({ received: true });

    const result = await controller.handleStripeWebhook(
      { rawBody },
      't=1,v1=abc',
    );

    expect(handleRawStripeWebhook).toHaveBeenCalledTimes(1);
    expect(handleRawStripeWebhook).toHaveBeenCalledWith(rawBody, 't=1,v1=abc');
    expect(result).toEqual({ received: true });
  });

  it('forwards undefined signature when the header is absent', async () => {
    handleRawStripeWebhook.mockResolvedValue({ received: false });

    await controller.handleStripeWebhook(
      { rawBody: Buffer.from('{}') },
      undefined,
    );

    expect(handleRawStripeWebhook).toHaveBeenCalledWith(
      expect.any(Buffer),
      undefined,
    );
  });
});
