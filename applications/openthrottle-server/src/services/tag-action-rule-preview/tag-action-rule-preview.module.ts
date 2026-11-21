import { Module } from '@nestjs/common';
import {
  PlansModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { TagsModule } from '../tags/tags.module.ts';
import { TagActionRulePreviewService } from './tag-action-rule-preview.service.ts';

/**
 * @description Provides {@link TagActionRulePreviewService}: the read-only rule match preview.
 * Imports no executor or ledger module on purpose.
 */
@Module({
  exports: [TagActionRulePreviewService],
  imports: [PlansModule, TagsModule, UsersModule],
  providers: [TagActionRulePreviewService],
})
export class TagActionRulePreviewModule {}
