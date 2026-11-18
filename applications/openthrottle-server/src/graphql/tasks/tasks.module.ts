/**
 * @description GraphQL module that registers TasksResolver and TasksLoaders (request-scoped DataLoaders). Imports the tasks, plans and projects table modules for TasksRepository, PlansRepository and ProjectsRepository.
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  ProjectsModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/producer/producer.module.ts';
import { TaggingQueueProducerModule } from '../../queues/tagging/producer/producer.module.ts';
import { TaskPromotionQueueProducerModule } from '../../queues/task-promotion/producer/producer.module.ts';
import { PlanStatusModule } from '../plans/plan-status/plan-status.module.ts';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger.module.ts';
import { TasksLoaders } from './loaders/loaders.service.ts';
import { TasksResolver } from './tasks.resolver.ts';

@Module({
  imports: [
    NotificationsModule,
    PlanRulesQueueProducerModule,
    PlansModule,
    PlanStatusModule,
    ProjectsModule,
    TaggingQueueProducerModule,
    TaskPromotionQueueProducerModule,
    TasksModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [TasksLoaders, TasksResolver],
})
export class TasksGraphqlModule {}
