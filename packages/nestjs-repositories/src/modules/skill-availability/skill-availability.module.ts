import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity';
import { SkillAvailabilityRule } from './skill-availability-rule.entity';
import { SkillAvailabilityService } from './skill-availability.service';

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
