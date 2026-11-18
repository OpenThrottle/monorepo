import { Module } from '@nestjs/common';

import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { McpConnectorConnectionsModule } from './modules/mcp-connector-connections/mcp-connector-connections.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SkillUsageOutcomesModule } from './modules/skill-usage-outcomes/skill-usage-outcomes.module.ts';
import { TelemetryHeartbeatsModule } from './modules/telemetry-heartbeats/telemetry-heartbeats.module.ts';
import { UserDisabledAgentClisModule } from './modules/user-disabled-agent-clis/user-disabled-agent-clis.module.ts';
import { UserFavoriteAgentModelsModule } from './modules/user-favorite-agent-models/user-favorite-agent-models.module.ts';
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
    McpConnectorConnectionsModule,
    NotesModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    WorktreeRemovalsModule,
  ],
  imports: [
    DailyStatsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    WorktreeRemovalsModule,
  ],
})
export class NestjsRepositoriesServerModule {}
