import { Module } from '@nestjs/common';

import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SkillUsageOutcomesModule } from './modules/skill-usage-outcomes/skill-usage-outcomes.module.ts';
import { TelemetryHeartbeatsModule } from './modules/telemetry-heartbeats/telemetry-heartbeats.module.ts';
import { WorktreeRemovalsModule } from './modules/worktree-removals/worktree-removals.module.ts';

/**
 * @description The TypeORM data-access layer for the `openthrottle` database:
 * aggregates and re-exports one module per table. Each table module binds to
 * the app's **default** DataSource (no named connection), which
 * `NestjsRepositoriesModule` still registers until the last migration batch
 * moves the DataSource config here.
 * @public
 */
@Module({
  exports: [
    DailyStatsModule,
    NotesModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TelemetryHeartbeatsModule,
    WorktreeRemovalsModule,
  ],
  imports: [
    DailyStatsModule,
    NotesModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TelemetryHeartbeatsModule,
    WorktreeRemovalsModule,
  ],
})
export class NestjsRepositoriesServerModule {}
