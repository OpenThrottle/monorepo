/**
 * @description GraphQL module that registers PlansResolver and PlansLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlansService, PlansQueueProducerModule for enqueuePlanRun, and QueuesGraphqlModule for enqueuePlanRalphOrchestrator.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module.ts';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module.ts';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { PlanCreationModule } from '../../services/plan-creation/plan-creation.module.ts';
import { PlanRunWorktreeCheckoutModule } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.module.ts';
import { QueuesGraphqlModule } from '../queues/queues-graphql.module.ts';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger-graphql.module.ts';
import { PlanEnqueueService } from './plan-enqueue.service.ts';
import { PlanRunObjectResolver } from './plan-run-object.resolver.ts';
import { PlanStatusService } from './plan-status.service.ts';
import { PlansResolver } from './plans.resolver.ts';
import { PlansLoaders } from './plans-loaders.ts';

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
