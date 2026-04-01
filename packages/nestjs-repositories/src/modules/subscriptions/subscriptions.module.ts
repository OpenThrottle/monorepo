import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [],
  exports: [SubscriptionsService],
  imports: [TypeOrmModule.forFeature([Subscription])],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
