/**
 * @description Nest module: Stripe Checkout, catalog (products), webhook HTTP controller, and GraphQL webhook mutation. App supplies persistence via {@link StripeModuleAsyncOptions.useFactory}.
 */

import { type DynamicModule, Module } from '@nestjs/common';

import { CheckoutService } from './checkout/checkout.service.ts';
import { StripeProductResolver } from './graphql/stripe-product/stripe-product.resolver.ts';
import { StripeWebhookResolver } from './graphql/stripe-webhook/stripe-webhook.resolver.ts';
import { StripeProductsService } from './stripe-products/stripe-products.service.ts';
import { StripeWebhookHandlerService } from './stripe-webhook-handler/stripe-webhook-handler.service.ts';
import type {
  StripeModuleAsyncOptions,
  StripeModuleInit,
} from './tokens/stripe.token.ts';
import {
  STRIPE_CHECKOUT_USER_PORT,
  STRIPE_MODULE_INIT,
  STRIPE_PROCESSED_EVENTS_PORT,
  STRIPE_SUBSCRIPTIONS_PORT,
} from './tokens/stripe.token.ts';
import { WebhooksController } from './webhooks/webhooks.controller.ts';

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
