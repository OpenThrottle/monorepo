import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SkillUsageEvent } from './skill-usage-event.entity.ts';
import { SkillUsageEventsRepository } from './skill-usage-events.repository.ts';

/**
 * @description Registers {@link SkillUsageEvent} on the default connection and
 * provides {@link SkillUsageEventsRepository}. Its capture-health and leaderboard
 * reads also query `skill_usage_outcomes` through the connection's entity manager,
 * so that entity must be registered on the same DataSource (the app's entity list
 * does; this module does not need `SkillUsageOutcomesModule`).
 * @public
 */
@Module({
  exports: [SkillUsageEventsRepository],
  imports: [TypeOrmModule.forFeature([SkillUsageEvent])],
  providers: [SkillUsageEventsRepository],
})
export class SkillUsageEventsModule {}
