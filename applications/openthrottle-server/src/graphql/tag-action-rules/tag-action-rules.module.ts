/**
 * @description Registers tag→action rule GraphQL types and user-scoped CRUD
 * plus the rule_applications ledger read.
 */

import './tag-action-rule.object.ts';
import './tag-action-rule-preview.object.ts';
import './tag-action-rules.input.ts';

import { Module } from '@nestjs/common';
import {
  RolesModule,
  RuleApplicationsModule,
  TagActionRulesModule as TagActionRulesRepositoryModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { TagActionRulePreviewModule } from '../../services/tag-action-rule-preview/tag-action-rule-preview.module.ts';
import { TagActionRulesModule } from '../../services/tag-action-rules/tag-action-rules.module.ts';
import { TagActionRulesResolver } from './tag-action-rules.resolver.ts';

@Module({
  imports: [
    RolesModule,
    RuleApplicationsModule,
    TagActionRulePreviewModule,
    TagActionRulesModule,
    TagActionRulesRepositoryModule,
  ],
  providers: [GqlPermissionsGuard, TagActionRulesResolver],
})
export class TagActionRulesGraphqlModule {}
