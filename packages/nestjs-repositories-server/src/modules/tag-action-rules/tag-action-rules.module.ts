import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TagActionRule } from './tag-action-rule.entity.ts';
import { TagActionRulesRepository } from './tag-action-rules.repository.ts';

/**
 * @description Registers {@link TagActionRule} on the default connection and provides
 * {@link TagActionRulesRepository}.
 * @public
 */
@Module({
  exports: [TagActionRulesRepository],
  imports: [TypeOrmModule.forFeature([TagActionRule])],
  providers: [TagActionRulesRepository],
})
export class TagActionRulesModule {}
