/**
 * @description Registers tag→action rule GraphQL types and user-scoped CRUD
 * plus the rule_applications ledger read.
 */

import './tag-action-rule.object.ts';
import './tag-action-rules.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { TagActionRulesResolver } from './tag-action-rules.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, TagActionRulesResolver],
})
export class TagActionRulesGraphqlModule {}
