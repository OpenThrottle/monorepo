/**
 * @description GraphQL module that registers TasksResolver and TasksLoaders (request-scoped DataLoaders). Imports NestjsRepositoriesModule for TasksService, PlansService, ProjectsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module';
import { TaggingQueueProducerModule } from '../../queues/tagging/tagging-queue-producer.module';
import { TasksLoaders } from './tasks-loaders';
import { TasksResolver } from './tasks.resolver';

@Module({
  imports: [
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanRulesQueueProducerModule,
    TaggingQueueProducerModule,
  ],
  providers: [TasksLoaders, TasksResolver],
})
export class TasksGraphqlModule {}
