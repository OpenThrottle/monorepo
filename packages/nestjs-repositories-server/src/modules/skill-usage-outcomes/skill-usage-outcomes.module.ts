import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillUsageOutcome } from './skill-usage-outcome.entity.ts';
import { SkillUsageOutcomesRepository } from './skill-usage-outcomes.repository.ts';

/**
 * @description Registers {@link SkillUsageOutcome} on the default connection and
 * provides {@link SkillUsageOutcomesRepository}.
 * @public
 */
@Module({
  exports: [SkillUsageOutcomesRepository],
  imports: [TypeOrmModule.forFeature([SkillUsageOutcome])],
  providers: [SkillUsageOutcomesRepository],
})
export class SkillUsageOutcomesModule {}
