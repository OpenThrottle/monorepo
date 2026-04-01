/**
 * @description Thin HTTP adapter for Stripe’s native webhook delivery: reads the raw body and `Stripe-Signature`, then delegates to {@link StripeWebhookHandlerService}.
 */

import { Controller, Headers, Post, Req } from '@nestjs/common';
import { StripeWebhookHandlerService } from '../services/stripe-webhook-handler.service';

/** Request carrying raw body for signature verification (Nest `rawBody: true`). */
interface RequestWithRawBody {
  readonly rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly stripeWebhookHandler: StripeWebhookHandlerService,
  ) {}

  /**
   * @description **Preferred path for the Stripe Dashboard:** configure the endpoint URL to `POST {baseUrl}/webhooks/stripe` (prepend your app’s global API prefix if any). Stripe sends the event body as the raw request bytes and the signing secret covers those exact bytes—do not route through a JSON parser first. The `Stripe-Signature` header must be forwarded unchanged. The host app must bootstrap Nest with `rawBody: true` so `req.rawBody` is a `Buffer` (see package README). For gateway or GraphQL-only integrations, use {@link StripeWebhookResolver.processStripeWebhook} with base64-encoded raw bytes instead.
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    return this.stripeWebhookHandler.handleRawStripeWebhook(
      req.rawBody,
      signature,
    );
  }
}
