/**
 * @deprecated Disabled in `app.module.ts` (PaymentsModule import commented). Kept for intentional rollback; do not delete without re-enabling the module.
 * @description Payments module: wires `@openthrottle/nestjs-stripe` to repository services.
 */

import {
  SubscriptionsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { SubscriptionsModule } from '@openthrottle/nestjs-repositories/src/modules/subscriptions/subscriptions.module';
import { UsersModule } from '@openthrottle/nestjs-repositories/src/modules/users/users.module';
import {
  StripeModule,
  type StripeModuleInit,
} from '@openthrottle/nestjs-stripe';
import { Module } from '@nestjs/common';

@Module({
  exports: [StripeModule],
  imports: [
    StripeModule.forRootAsync({
      imports: [SubscriptionsModule, UsersModule],
      inject: [UsersService, SubscriptionsService],
      useFactory: (
        usersService: UsersService,
        subscriptionsService: SubscriptionsService,
      ): StripeModuleInit => ({
        checkoutUser: {
          findById: async (id: string) => {
            const user = await usersService.findById(id);
            return user ? { email: user.email ?? null } : null;
          },
        },
        subscriptions: subscriptionsService,
      }),
    }),
  ],
})
export class PaymentsModule {}
