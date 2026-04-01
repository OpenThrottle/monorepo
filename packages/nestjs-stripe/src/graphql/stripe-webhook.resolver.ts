/**
 * @description GraphQL entrypoint for Stripe webhooks when the raw body is sent as base64 (e.g. gateway → GraphQL). Delegates to {@link StripeWebhookHandlerService}.
 */

import { Public } from '@openthrottle/nestjs-auth';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { StripeWebhookHandlerService } from '../services/stripe-webhook-handler.service';
import { ProcessStripeWebhookInput } from './stripe-webhook-mutation.input';
import { StripeWebhookProcessedPayload } from './stripe-webhook-mutation.object';

@Resolver()
export class StripeWebhookResolver {
  constructor(
    private readonly stripeWebhookHandler: StripeWebhookHandlerService,
  ) {}

  @Public()
  @Mutation(() => StripeWebhookProcessedPayload, {
    description: `Verify and process a Stripe webhook. Pass the exact raw body bytes as base64 and the Stripe-Signature header value.`,
  })
  async processStripeWebhook(
    @Args('input', { type: () => ProcessStripeWebhookInput })
    input: ProcessStripeWebhookInput,
  ): Promise<StripeWebhookProcessedPayload> {
    const rawBody = Buffer.from(input.rawPayloadBase64, 'base64');
    const result = await this.stripeWebhookHandler.handleRawStripeWebhook(
      rawBody,
      input.stripeSignature,
    );

    return { received: result.received };
  }
}
