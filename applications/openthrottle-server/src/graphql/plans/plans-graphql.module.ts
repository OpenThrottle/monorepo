/**
 * @description GraphQL module that registers PlansResolver and PlansLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlansService, PlansQueueProducerModule for enqueuePlanRun, and QueuesGraphqlModule for enqueuePlanRalphOrchestrator.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module';
import { PlanCreationModule } from '../../services/plan-creation/plan-creation.module';
import { QueuesGraphqlModule } from '../queues/queues-graphql.module';
import { PlanEnqueueService } from './plan-enqueue.service';
import { PlanStatusService } from './plan-status.service';
import { PlansLoaders } from './plans-loaders';
import { PlansResolver } from './plans.resolver';

@Module({
  imports: [
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanCreationModule,
    PlansQueueProducerModule,
    QueuesGraphqlModule,
  ],
  providers: [
    PlanEnqueueService,
    PlanStatusService,
    PlansLoaders,
    PlansResolver,
  ],
})
export class PlansGraphqlModule {}
