/**
 * @description GraphQL module that registers PlansResolver and imports NestjsRepositoriesModule for PlansService and PlansQueueModule for enqueuePlanRun.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PlansQueueModule } from '../../queues/plans/plans-queue.module';
import { PlansResolver } from './plans.resolver';

@Module({
  imports: [NestjsRepositoriesModule, NotificationsModule, PlansQueueModule],
  providers: [PlansResolver],
})
export class PlansGraphqlModule {}
