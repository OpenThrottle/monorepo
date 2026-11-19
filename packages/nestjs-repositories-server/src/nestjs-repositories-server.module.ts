import { Module } from '@nestjs/common';

import { AgentAccountsModule } from './modules/agent-accounts/agent-accounts.module.ts';
import { AgentConversationMessagesModule } from './modules/agent-conversation-messages/agent-conversation-messages.module.ts';
import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module.ts';
import { AgentTokenUsageModule } from './modules/agent-token-usage/agent-token-usage.module.ts';
import { AgentTrajectoriesModule } from './modules/agent-trajectories/agent-trajectories.module.ts';
import { BlogAuthorsModule } from './modules/blog-authors/blog-authors.module.ts';
import { BlogPostsModule } from './modules/blog-posts/blog-posts.module.ts';
import { BlogTagsModule } from './modules/blog-tags/blog-tags.module.ts';
import { CustomPromptsModule } from './modules/custom-prompts/custom-prompts.module.ts';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { EvalCasesModule } from './modules/eval-cases/eval-cases.module.ts';
import { EvalDatasetsModule } from './modules/eval-datasets/eval-datasets.module.ts';
import { EvalGradesModule } from './modules/eval-grades/eval-grades.module.ts';
import { EvalHumanLabelsModule } from './modules/eval-human-labels/eval-human-labels.module.ts';
import { EvalJudgeCalibrationsModule } from './modules/eval-judge-calibrations/eval-judge-calibrations.module.ts';
import { EvalRunsModule } from './modules/eval-runs/eval-runs.module.ts';
import { EvalTrialsModule } from './modules/eval-trials/eval-trials.module.ts';
import { McpConnectorConnectionsModule } from './modules/mcp-connector-connections/mcp-connector-connections.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { PermissionsModule } from './modules/permissions/permissions.module.ts';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module.ts';
import { PlanMessagesModule } from './modules/plan-messages/plan-messages.module.ts';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module.ts';
import { PlanRunsModule } from './modules/plan-runs/plan-runs.module.ts';
import { PlanTagsModule } from './modules/plan-tags/plan-tags.module.ts';
import { PlansModule } from './modules/plans/plans.module.ts';
import { ProjectSkillsModule } from './modules/project-skills/project-skills.module.ts';
import { ProjectTagsModule } from './modules/project-tags/project-tags.module.ts';
import { ProjectsModule } from './modules/projects/projects.module.ts';
import { RepositoriesModule } from './modules/repositories/repositories.module.ts';
import { RepositoryCheckoutsModule } from './modules/repository-checkouts/repository-checkouts.module.ts';
import { RolesModule } from './modules/roles/roles.module.ts';
import { RuleApplicationsModule } from './modules/rule-applications/rule-applications.module.ts';
import { ScheduledAgentJobRunsModule } from './modules/scheduled-agent-job-runs/scheduled-agent-job-runs.module.ts';
import { ScheduledAgentJobsModule } from './modules/scheduled-agent-jobs/scheduled-agent-jobs.module.ts';
import { ServiceAccountCredentialsModule } from './modules/service-account-credentials/service-account-credentials.module.ts';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module.ts';
import { SkillAvailabilityRuleSetsModule } from './modules/skill-availability-rule-sets/skill-availability-rule-sets.module.ts';
import { SkillAvailabilityRulesModule } from './modules/skill-availability-rules/skill-availability-rules.module.ts';
import { SkillTagsModule } from './modules/skill-tags/skill-tags.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SkillUsageOutcomesModule } from './modules/skill-usage-outcomes/skill-usage-outcomes.module.ts';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.ts';
import { TagActionRulesModule } from './modules/tag-action-rules/tag-action-rules.module.ts';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module.ts';
import { TaskTagsModule } from './modules/task-tags/task-tags.module.ts';
import { TasksModule } from './modules/tasks/tasks.module.ts';
import { TelemetryHeartbeatsModule } from './modules/telemetry-heartbeats/telemetry-heartbeats.module.ts';
import { UserDisabledAgentClisModule } from './modules/user-disabled-agent-clis/user-disabled-agent-clis.module.ts';
import { UserFavoriteAgentModelsModule } from './modules/user-favorite-agent-models/user-favorite-agent-models.module.ts';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module.ts';
import { UserWorkspaceSettingsModule } from './modules/user-workspace-settings/user-workspace-settings.module.ts';
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
    AgentConversationMessagesModule,
    AgentConversationsModule,
    AgentTokenUsageModule,
    AgentTrajectoriesModule,
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    CustomPromptsModule,
    DailyStatsModule,
    EvalCasesModule,
    EvalDatasetsModule,
    EvalGradesModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    EvalTrialsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PermissionsModule,
    PlanEmbeddingsModule,
    PlanMessagesModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlanTagsModule,
    PlansModule,
    ProjectSkillsModule,
    ProjectTagsModule,
    ProjectsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
    RolesModule,
    RuleApplicationsModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillAvailabilityRuleSetsModule,
    SkillAvailabilityRulesModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TaskEmbeddingsModule,
    TaskTagsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    UserPreferencesModule,
    UserWorkspaceSettingsModule,
    UsersModule,
    WorkArtifactsModule,
    WorkSessionSubjectsModule,
    WorkSessionsModule,
    WorktreeRemovalsModule,
  ],
  imports: [
    AgentAccountsModule,
    AgentConversationMessagesModule,
    AgentConversationsModule,
    AgentTokenUsageModule,
    AgentTrajectoriesModule,
    BlogAuthorsModule,
    BlogPostsModule,
    BlogTagsModule,
    CustomPromptsModule,
    DailyStatsModule,
    EvalCasesModule,
    EvalDatasetsModule,
    EvalGradesModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    EvalTrialsModule,
    McpConnectorConnectionsModule,
    NotesModule,
    PermissionsModule,
    PlanEmbeddingsModule,
    PlanMessagesModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlanTagsModule,
    PlansModule,
    ProjectSkillsModule,
    ProjectTagsModule,
    ProjectsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
    RolesModule,
    RuleApplicationsModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillAvailabilityRuleSetsModule,
    SkillAvailabilityRulesModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SkillUsageOutcomesModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TaskEmbeddingsModule,
    TaskTagsModule,
    TasksModule,
    TelemetryHeartbeatsModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    UserPreferencesModule,
    UserWorkspaceSettingsModule,
    UsersModule,
    WorkArtifactsModule,
    WorkSessionSubjectsModule,
    WorkSessionsModule,
    WorktreeRemovalsModule,
  ],
})
export class NestjsRepositoriesServerModule {}
