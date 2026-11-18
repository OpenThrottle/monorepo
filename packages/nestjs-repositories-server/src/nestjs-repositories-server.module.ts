import { Module } from '@nestjs/common';

import { BlogAuthorsModule } from './modules/blog-authors/blog-authors.module.ts';
import { BlogPostsModule } from './modules/blog-posts/blog-posts.module.ts';
import { BlogTagsModule } from './modules/blog-tags/blog-tags.module.ts';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { McpConnectorConnectionsModule } from './modules/mcp-connector-connections/mcp-connector-connections.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module.ts';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module.ts';
import { PlansModule } from './modules/plans/plans.module.ts';
import { ProjectsModule } from './modules/projects/projects.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SkillUsageOutcomesModule } from './modules/skill-usage-outcomes/skill-usage-outcomes.module.ts';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module.ts';
import { TasksModule } from './modules/tasks/tasks.module.ts';
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
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    DailyStatsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlansModule,
    ProjectsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TaskEmbeddingsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    WorktreeRemovalsModule,
  ],
  imports: [
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    DailyStatsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlansModule,
    ProjectsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    TaskEmbeddingsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    WorktreeRemovalsModule,
  ],
})
export class NestjsRepositoriesServerModule {}
