/**
 * @description Registers plan/task tag GraphQL types, the tags fields on
 * Plan/Task, and the identity-derived tag mutations.
 */

import './tag.object.ts';
import './tags.input.ts';

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/producer/producer.module.ts';
import { TagsLoaders } from './loaders/loaders.service.ts';
import { PlanTagsResolver } from './plan-tags/plan-tags.resolver.ts';
import { ProjectTagsResolver } from './project-tags/project-tags.resolver.ts';
import { TaskTagsResolver } from './task-tags/task-tags.resolver.ts';

@Module({
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRulesQueueProducerModule,
  ],
  providers: [
    GqlPermissionsGuard,
    PlanTagsResolver,
    ProjectTagsResolver,
    TagsLoaders,
    TaskTagsResolver,
  ],
})
export class TagsGraphqlModule {}
