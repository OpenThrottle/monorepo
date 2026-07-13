/**
 * @description Registers tag→action rule GraphQL types and user-scoped CRUD
 * plus the rule_applications ledger read.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import './tag-action-rule.object';
import './tag-action-rules.input';
import { TagActionRulesResolver } from './tag-action-rules.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, TagActionRulesResolver],
})
export class TagActionRulesGraphqlModule {}
