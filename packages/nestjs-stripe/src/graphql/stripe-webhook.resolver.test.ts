import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeWebhookHandlerService } from '../services/stripe-webhook-handler.service';
import { StripeWebhookResolver } from './stripe-webhook.resolver';

describe('StripeWebhookResolver', () => {
  let resolver: StripeWebhookResolver;
  const handleRawStripeWebhook = vi.fn();

  beforeEach(async () => {
    handleRawStripeWebhook.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookResolver,
        {
          provide: StripeWebhookHandlerService,
          useValue: { handleRawStripeWebhook },
        },
      ],
    }).compile();

    resolver = module.get(StripeWebhookResolver);
  });

  it('decodes base64 and delegates to StripeWebhookHandlerService', async () => {
    const payload = { hello: 'world' };
    const raw = Buffer.from(JSON.stringify(payload));
    handleRawStripeWebhook.mockResolvedValue({ received: true });

    const result = await resolver.processStripeWebhook({
      rawPayloadBase64: raw.toString('base64'),
      stripeSignature: 'sig_test',
    });

    expect(handleRawStripeWebhook).toHaveBeenCalledTimes(1);
    expect(handleRawStripeWebhook).toHaveBeenCalledWith(
      expect.any(Buffer),
      'sig_test',
    );
    const firstArg = handleRawStripeWebhook.mock.calls[0]?.[0];
    expect(Buffer.isBuffer(firstArg)).toBe(true);
    if (Buffer.isBuffer(firstArg)) {
      expect(firstArg.equals(raw)).toBe(true);
    }
    expect(result).toEqual({ received: true });
  });

  it('propagates errors from the handler', async () => {
    handleRawStripeWebhook.mockRejectedValue(new Error('verify failed'));

    await expect(
      resolver.processStripeWebhook({
        rawPayloadBase64: Buffer.from('{}').toString('base64'),
        stripeSignature: 'sig',
      }),
    ).rejects.toThrow('verify failed');
  });
});
