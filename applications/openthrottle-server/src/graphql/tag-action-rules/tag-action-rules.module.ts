/**
 * @description Registers tag→action rule GraphQL types and user-scoped CRUD
 * plus the rule_applications ledger read.
 */

import './tag-action-rule.object.ts';
import './tag-action-rules.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { TagActionRulesResolver } from './tag-action-rules.resolver.ts';

@Module({
  imports: [RolesModule, NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, TagActionRulesResolver],
})
export class TagActionRulesGraphqlModule {}
