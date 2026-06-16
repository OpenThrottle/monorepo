/**
 * @description GraphQL module registering the notification subscription resolver.
 * PubSub comes from the global PubSubModule; the NotificationEvent concrete types
 * are registered as orphanedTypes in the root GraphQL config (app.module) since the
 * subscriptions return the interface.
 */
import { Module } from '@nestjs/common';
import { NotificationsSubscriptionResolver } from './notifications-subscription.resolver';

@Module({
  providers: [NotificationsSubscriptionResolver],
})
export class NotificationsGraphqlModule {}
