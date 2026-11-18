import { Module } from '@nestjs/common';

import { AgentAccountsModule } from './modules/agent-accounts/agent-accounts.module.ts';
import { BlogAuthorsModule } from './modules/blog-authors/blog-authors.module.ts';
import { BlogPostsModule } from './modules/blog-posts/blog-posts.module.ts';
import { BlogTagsModule } from './modules/blog-tags/blog-tags.module.ts';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { McpConnectorConnectionsModule } from './modules/mcp-connector-connections/mcp-connector-connections.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { PermissionsModule } from './modules/permissions/permissions.module.ts';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module.ts';
import { PlanMessagesModule } from './modules/plan-messages/plan-messages.module.ts';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module.ts';
import { PlanRunsModule } from './modules/plan-runs/plan-runs.module.ts';
import { PlansModule } from './modules/plans/plans.module.ts';
import { ProjectsModule } from './modules/projects/projects.module.ts';
import { RolesModule } from './modules/roles/roles.module.ts';
import { ServiceAccountCredentialsModule } from './modules/service-account-credentials/service-account-credentials.module.ts';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module.ts';
import { SkillTagsModule } from './modules/skill-tags/skill-tags.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SkillUsageOutcomesModule } from './modules/skill-usage-outcomes/skill-usage-outcomes.module.ts';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.ts';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module.ts';
import { TasksModule } from './modules/tasks/tasks.module.ts';
import { TelemetryHeartbeatsModule } from './modules/telemetry-heartbeats/telemetry-heartbeats.module.ts';
import { UserDisabledAgentClisModule } from './modules/user-disabled-agent-clis/user-disabled-agent-clis.module.ts';
import { UserFavoriteAgentModelsModule } from './modules/user-favorite-agent-models/user-favorite-agent-models.module.ts';
import { UsersModule } from './modules/users/users.module.ts';
import { WorkArtifactsModule } from './modules/work-artifacts/work-artifacts.module.ts';
import { WorkSessionSubjectsModule } from './modules/work-session-subjects/work-session-subjects.module.ts';
import { WorkSessionsModule } from './modules/work-sessions/work-sessions.module.ts';
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
    AgentAccountsModule,
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    DailyStatsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PermissionsModule,
    PlanEmbeddingsModule,
    PlanMessagesModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectsModule,
    RolesModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    SubscriptionsModule,
    TaskEmbeddingsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    UsersModule,
    WorkArtifactsModule,
    WorkSessionSubjectsModule,
    WorkSessionsModule,
    WorktreeRemovalsModule,
  ],
  imports: [
    AgentAccountsModule,
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    DailyStatsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PermissionsModule,
    PlanEmbeddingsModule,
    PlanMessagesModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectsModule,
    RolesModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    SubscriptionsModule,
    TaskEmbeddingsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    UsersModule,
    WorkArtifactsModule,
    WorkSessionSubjectsModule,
    WorkSessionsModule,
    WorktreeRemovalsModule,
  ],
})
export class NestjsRepositoriesServerModule {}
