import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Subscription } from './subscription.entity.ts';
import { SubscriptionsRepository } from './subscriptions.repository.ts';

/**
 * @description Registers {@link Subscription} on the default connection and provides
 * {@link SubscriptionsRepository}.
 * @public
 */
@Module({
  exports: [SubscriptionsRepository],
  imports: [TypeOrmModule.forFeature([Subscription])],
  providers: [SubscriptionsRepository],
})
export class SubscriptionsModule {}
