/**
 * @description Nest module: Stripe Checkout, catalog (products), webhook HTTP controller, and GraphQL webhook mutation. App supplies persistence via {@link StripeModuleAsyncOptions.useFactory}.
 */

import { type DynamicModule, Module } from '@nestjs/common';
import { WebhooksController } from '../controllers/webhooks.controller';
import { StripeProductResolver } from '../graphql/stripe-product.resolver';
import { StripeWebhookResolver } from '../graphql/stripe-webhook.resolver';
import { CheckoutService } from '../services/checkout.service';
import { StripeProductsService } from '../services/stripe-products.service';
import { StripeWebhookHandlerService } from '../services/stripe-webhook-handler.service';
import {
  STRIPE_CHECKOUT_USER_PORT,
  STRIPE_MODULE_INIT,
  STRIPE_PROCESSED_EVENTS_PORT,
  STRIPE_SUBSCRIPTIONS_PORT,
  type StripeModuleAsyncOptions,
  type StripeModuleInit,
} from '../tokens/stripe-tokens';

@Module({})
export class StripeModule {
  /**
   * @description Registers checkout + webhooks with app-layer ports from `useFactory`.
   */
  static forRootAsync(options: StripeModuleAsyncOptions): DynamicModule {
    return {
      controllers: [WebhooksController],
      exports: [
        CheckoutService,
        StripeProductResolver,
        StripeProductsService,
        StripeWebhookHandlerService,
        StripeWebhookResolver,
      ],
      global: options.isGlobal === true,
      imports: [...(options.imports ?? [])],
      module: StripeModule,
      providers: [
        {
          inject: options.inject ?? [],
          provide: STRIPE_MODULE_INIT,
          useFactory: options.useFactory,
        },
        {
          inject: [STRIPE_MODULE_INIT],
          provide: STRIPE_CHECKOUT_USER_PORT,
          useFactory: (init: StripeModuleInit) => init.checkoutUser,
        },
        {
          inject: [STRIPE_MODULE_INIT],
          provide: STRIPE_PROCESSED_EVENTS_PORT,
          useFactory: (init: StripeModuleInit) => init.processedEvents ?? null,
        },
        {
          inject: [STRIPE_MODULE_INIT],
          provide: STRIPE_SUBSCRIPTIONS_PORT,
          useFactory: (init: StripeModuleInit) => init.subscriptions,
        },
        CheckoutService,
        StripeProductResolver,
        StripeProductsService,
        StripeWebhookHandlerService,
        StripeWebhookResolver,
      ],
    };
  }
}
