/**
 * @description Registers skill-tag vocabulary GraphQL types and user-scoped CRUD.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import './skill-tag.object';
import './skill-tags.input';
import { SkillTagsResolver } from './skill-tags.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, SkillTagsResolver],
})
export class SkillTagsGraphqlModule {}
