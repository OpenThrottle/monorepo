import { Module } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { getTypeOrmOptions } from './database.config.ts';
import { AgentCliPreferencesModule } from './modules/agent-cli-preferences/agent-cli-preferences.module.ts';
import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module.ts';
import { AgentTokenUsageModule } from './modules/agent-token-usage/agent-token-usage.module.ts';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module.ts';
import { McpConnectorsModule } from './modules/mcp-connectors/mcp-connectors.module.ts';
import { NotesModule } from './modules/notes/notes.module.ts';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module.ts';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module.ts';
import { PlanRunsModule } from './modules/plan-runs/plan-runs.module.ts';
import { PlansModule } from './modules/plans/plans.module.ts';
import { ProjectSkillsModule } from './modules/project-skills/project-skills.module.ts';
import { ProjectsModule } from './modules/projects/projects.module.ts';
import { CustomPromptsModule } from './modules/prompts/custom-prompts.module.ts';
import { RepositoriesModule } from './modules/repositories/repositories.module.ts';
import { RolesModule } from './modules/roles/roles.module.ts';
import { ScheduledAgentJobsModule } from './modules/scheduled-agent-jobs/scheduled-agent-jobs.module.ts';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module.ts';
import { SkillAvailabilityModule } from './modules/skill-availability/skill-availability.module.ts';
import { SkillTagsModule } from './modules/skill-tags/skill-tags.module.ts';
import { SkillUsageEventsModule } from './modules/skill-usage-events/skill-usage-events.module.ts';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.ts';
import { TagActionRulesModule } from './modules/tag-action-rules/tag-action-rules.module.ts';
import { TagsModule } from './modules/tags/tags.module.ts';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module.ts';
import { TasksModule } from './modules/tasks/tasks.module.ts';
import { UsersModule } from './modules/users/users.module.ts';
import { WorkLedgerModule } from './modules/work-ledger/work-ledger.module.ts';
import { WorkspaceSettingsModule } from './modules/workspace-settings/workspace-settings.module.ts';

@Module({
  controllers: [],
  exports: [
    AgentCliPreferencesModule,
    AgentConversationsModule,
    AgentTokenUsageModule,
    CustomPromptsModule,
    DailyStatsModule,
    McpConnectorsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectSkillsModule,
    ProjectsModule,
    RepositoriesModule,
    RolesModule,
    ScheduledAgentJobsModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TagsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
    WorkLedgerModule,
    WorkspaceSettingsModule,
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        // autoLoadEntities lets a package that owns its own entity register it via
        // TypeOrmModule.forFeature (e.g. @openthrottle/nestjs-rollout's RolloutFlag)
        // without adding it to getTypeOrmOptions()'s explicit list — which it cannot,
        // since those packages depend on nestjs-repositories, not the reverse.
        return { ...getTypeOrmOptions(), autoLoadEntities: true };
      },
    }),
    AgentCliPreferencesModule,
    AgentConversationsModule,
    AgentTokenUsageModule,
    CustomPromptsModule,
    DailyStatsModule,
    LoggerModule,
    McpConnectorsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectSkillsModule,
    ProjectsModule,
    RepositoriesModule,
    RolesModule,
    ScheduledAgentJobsModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
    SkillUsageEventsModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TagsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
    WorkLedgerModule,
    WorkspaceSettingsModule,
  ],
  providers: [],
})
export class NestjsRepositoriesModule {}
