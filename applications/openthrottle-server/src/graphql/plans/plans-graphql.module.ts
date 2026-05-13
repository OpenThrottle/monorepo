/**
 * @description GraphQL module that registers PlansResolver and imports NestjsRepositoriesModule for PlansService, PlansQueueModule for enqueuePlanRun, and QueuesGraphqlModule for enqueuePlanRalphOrchestrator.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PlansQueueModule } from '../../queues/plans/plans-queue.module';
import { PlanCreationModule } from '../../services/plan-creation/plan-creation.module';
import { QueuesGraphqlModule } from '../queues/queues-graphql.module';
import { PlansResolver } from './plans.resolver';

@Module({
  imports: [
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanCreationModule,
    PlansQueueModule,
    QueuesGraphqlModule,
  ],
  providers: [PlansResolver],
})
export class PlansGraphqlModule {}
