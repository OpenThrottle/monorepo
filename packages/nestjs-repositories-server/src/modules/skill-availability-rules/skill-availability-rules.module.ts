import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';
import { SkillAvailabilityRulesRepository } from './skill-availability-rules.repository.ts';

/**
 * @description Registers {@link SkillAvailabilityRule} on the default connection and provides
 * {@link SkillAvailabilityRulesRepository}.
 * @public
 */
@Module({
  exports: [SkillAvailabilityRulesRepository],
  imports: [TypeOrmModule.forFeature([SkillAvailabilityRule])],
  providers: [SkillAvailabilityRulesRepository],
})
export class SkillAvailabilityRulesModule {}
