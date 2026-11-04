import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { SkillAvailabilityService } from './skill-availability.service.ts';
import { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';

@Module({
  controllers: [],
  exports: [SkillAvailabilityService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([SkillAvailabilityRule, SkillAvailabilityRuleSet]),
  ],
  providers: [SkillAvailabilityService],
})
export class SkillAvailabilityModule {}
