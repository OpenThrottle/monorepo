import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  SkillAvailabilityRuleSetsModule,
  SkillAvailabilityRulesModule,
} from '@openthrottle/nestjs-repositories-server';

import { SkillAvailabilityService } from './skill-availability.service.ts';

/**
 * @description Provides {@link SkillAvailabilityService}: the per-project rule set read mapped
 * onto the resolver shape and the validated rule set and rule writes.
 */
@Module({
  exports: [SkillAvailabilityService],
  imports: [
    LoggerModule,
    SkillAvailabilityRuleSetsModule,
    SkillAvailabilityRulesModule,
  ],
  providers: [SkillAvailabilityService],
})
export class SkillAvailabilityModule {}
