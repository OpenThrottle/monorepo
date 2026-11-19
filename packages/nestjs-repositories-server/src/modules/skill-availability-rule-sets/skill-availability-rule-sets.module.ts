import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';
import { SkillAvailabilityRuleSetsRepository } from './skill-availability-rule-sets.repository.ts';

/**
 * @description Registers {@link SkillAvailabilityRuleSet} on the default connection and provides
 * {@link SkillAvailabilityRuleSetsRepository}.
 * @public
 */
@Module({
  exports: [SkillAvailabilityRuleSetsRepository],
  imports: [TypeOrmModule.forFeature([SkillAvailabilityRuleSet])],
  providers: [SkillAvailabilityRuleSetsRepository],
})
export class SkillAvailabilityRuleSetsModule {}
