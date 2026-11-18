/**
 * @description Registers skill-tag vocabulary GraphQL types and user-scoped CRUD.
 */

import './skill-tag.object.ts';
import './skill-tags.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { SkillTagsResolver } from './skill-tags.resolver.ts';

@Module({
  imports: [RolesModule, NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, SkillTagsResolver],
})
export class SkillTagsGraphqlModule {}
