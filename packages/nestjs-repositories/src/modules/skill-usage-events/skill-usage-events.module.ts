import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { SkillUsageEvent } from './skill-usage-events.entity';
import { SkillUsageEventsService } from './skill-usage-events.service';

@Module({
  controllers: [],
  exports: [SkillUsageEventsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([SkillUsageEvent])],
  providers: [SkillUsageEventsService],
})
export class SkillUsageEventsModule {}
