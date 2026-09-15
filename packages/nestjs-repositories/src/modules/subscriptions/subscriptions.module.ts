import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Subscription } from './subscription.entity.ts';
import { SubscriptionsService } from './subscriptions.service.ts';

@Module({
  controllers: [],
  exports: [SubscriptionsService],
  imports: [TypeOrmModule.forFeature([Subscription])],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
