import { Module } from '@nestjs/common';
import { TagActionRulesModule as TagActionRulesRepositoryModule } from '@openthrottle/nestjs-repositories-server';

import { TagActionRulesService } from './tag-action-rules.service.ts';

/**
 * @description Provides {@link TagActionRulesService}: the validated write path over the
 * tag_action_rules table. Reads and deletes go straight to `TagActionRulesRepository`.
 */
@Module({
  exports: [TagActionRulesService],
  imports: [TagActionRulesRepositoryModule],
  providers: [TagActionRulesService],
})
export class TagActionRulesModule {}
