/**
 * @description Registers plan/task tag GraphQL types, the tags fields on
 * Plan/Task, and the identity-derived tag mutations.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { PlanRulesQueueProducerModule } from '../../queues/plan-rules/plan-rules-queue-producer.module';
import './tag.object';
import './tags.input';
import {
  PlanTagsResolver,
  ProjectTagsResolver,
  TaskTagsResolver,
} from './tags.resolver';
import { TagsLoaders } from './tags-loaders';

@Module({
  imports: [NestjsRepositoriesModule, PlanRulesQueueProducerModule],
  providers: [
    GqlPermissionsGuard,
    PlanTagsResolver,
    ProjectTagsResolver,
    TagsLoaders,
    TaskTagsResolver,
  ],
})
export class TagsGraphqlModule {}
