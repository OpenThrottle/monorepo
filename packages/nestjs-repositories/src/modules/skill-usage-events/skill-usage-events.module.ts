import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { SkillUsageEvent } from './skill-usage-events.entity.ts';
import { SkillUsageEventsService } from './skill-usage-events.service.ts';
import { SkillUsageOutcome } from './skill-usage-outcomes.entity.ts';

@Module({
  controllers: [],
  exports: [SkillUsageEventsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([SkillUsageEvent, SkillUsageOutcome]),
  ],
  providers: [SkillUsageEventsService],
})
export class SkillUsageEventsModule {}
