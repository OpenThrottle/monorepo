/**
 * @description GraphQL module that registers TasksResolver and TasksLoaders (request-scoped DataLoaders). Imports NestjsRepositoriesModule for TasksService, PlansService, ProjectsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module.ts';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module.ts';
import { TaskPromotionQueueProducerModule } from '../../queues/task-promotion/task-promotion-queue-producer.module.ts';
import { PlanStatusModule } from '../plans/plan-status.module.ts';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger-graphql.module.ts';
import { TasksResolver } from './tasks.resolver.ts';
import { TasksLoaders } from './tasks-loaders.ts';

@Module({
  imports: [
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanRulesQueueProducerModule,
    PlanStatusModule,
    TaggingQueueProducerModule,
    TaskPromotionQueueProducerModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [TasksLoaders, TasksResolver],
})
export class TasksGraphqlModule {}
