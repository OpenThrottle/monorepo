/**
 * @description GraphQL module that registers PlansResolver and PlansLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlansService, PlansQueueProducerModule for enqueuePlanRun, and QueuesGraphqlModule for enqueuePlanRalphOrchestrator.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module';
import { PlanCreationModule } from '../../services/plan-creation/plan-creation.module';
import { PlanRunWorktreeCheckoutModule } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.module';
import { QueuesGraphqlModule } from '../queues/queues-graphql.module';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger-graphql.module';
import { PlanEnqueueService } from './plan-enqueue.service';
import { PlanRunObjectResolver } from './plan-run-object.resolver';
import { PlanStatusService } from './plan-status.service';
import { PlansLoaders } from './plans-loaders';
import { PlansResolver } from './plans.resolver';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanCreationModule,
    PlanRulesQueueProducerModule,
    PlanRunWorktreeCheckoutModule,
    PlansQueueProducerModule,
    TaggingQueueProducerModule,
    QueuesGraphqlModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [
    PlanEnqueueService,
    PlanRunObjectResolver,
    PlanStatusService,
    PlansLoaders,
    PlansResolver,
  ],
})
export class PlansGraphqlModule {}
