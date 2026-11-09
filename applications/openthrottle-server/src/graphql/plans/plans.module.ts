/**
 * @description GraphQL module that registers PlansResolver and PlansLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlansService, PlansQueueProducerModule for enqueuePlanRun, and QueuesGraphqlModule for enqueuePlanRalphOrchestrator.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/producer/producer.module.ts';
import { PlansQueueProducerModule } from '../../queues/plans/producer/producer.module.ts';
import { TaggingQueueProducerModule } from '../../queues/tagging/producer/producer.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { PlanCreationModule } from '../../services/plan-creation/plan-creation.module.ts';
import { PlanRunWorktreeCheckoutModule } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.module.ts';
import { WorktreeCheckoutPruneModule } from '../../services/worktree-checkout-prune/worktree-checkout-prune.module.ts';
import { QueuesGraphqlModule } from '../queues/queues.module.ts';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger.module.ts';
import { PlansLoaders } from './loaders/loaders.service.ts';
import { PlanEnqueueModule } from './plan-enqueue/plan-enqueue.module.ts';
import { PlanRunObjectResolver } from './plan-run-object/plan-run-object.resolver.ts';
import { PlanStatusModule } from './plan-status/plan-status.module.ts';
import { PlansResolver } from './plans.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanCreationModule,
    PlanEnqueueModule,
    PlanRulesQueueProducerModule,
    PlanRunWorktreeCheckoutModule,
    PlanStatusModule,
    PlansQueueProducerModule,
    TaggingQueueProducerModule,
    QueuesGraphqlModule,
    WorkLedgerGraphqlModule,
    WorktreeCheckoutPruneModule,
  ],
  providers: [PlanRunObjectResolver, PlansLoaders, PlansResolver],
})
export class PlansGraphqlModule {}
