/**
 * @description Registers plan/task tag GraphQL types, the tags fields on
 * Plan/Task, and the identity-derived tag mutations.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import './tag.object';
import './tags.input';
import { PlanTagsResolver, TaskTagsResolver } from './tags.resolver';
import { TagsLoaders } from './tags-loaders';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [
    GqlPermissionsGuard,
    PlanTagsResolver,
    TagsLoaders,
    TaskTagsResolver,
  ],
})
export class TagsGraphqlModule {}
