/**
 * @deprecated Disabled in `app.module.ts` (PaymentsGraphqlModule / PaymentsModule imports commented). Kept for intentional rollback; do not delete without re-enabling modules.
 * @description GraphQL module for payments: Stripe catalog queries (`stripeProducts`, `stripeProduct`), checkout session mutation, `mySubscription` query, and Stripe webhook mutation.
 * `PaymentsModule` registers `@openthrottle/nestjs-stripe` `StripeModule`, which provides `StripeWebhookResolver` (`processStripeWebhook`) and `StripeProductResolver` (batched `prices` on `StripeProductObject`); it merges into the app schema with `PaymentsResolver`.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { PaymentsModule } from '../../modules/payments/payments.module';
import { PaymentsResolver } from './payments.resolver';

@Module({
  imports: [NestjsRepositoriesModule, PaymentsModule],
  providers: [PaymentsResolver],
})
export class PaymentsGraphqlModule {}
