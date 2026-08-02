import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module';
import { AgentTokenUsageModule } from './modules/agent-token-usage/agent-token-usage.module';
import { CustomPromptsModule } from './modules/prompts/custom-prompts.module';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module';
import { getTypeOrmOptions } from './database.config';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { NotesModule } from './modules/notes/notes.module';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module';
import { PlanRunsModule } from './modules/plan-runs/plan-runs.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProjectSkillsModule } from './modules/project-skills/project-skills.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { RolesModule } from './modules/roles/roles.module';
import { ScheduledAgentJobsModule } from './modules/scheduled-agent-jobs/scheduled-agent-jobs.module';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module';
import { SkillAvailabilityModule } from './modules/skill-availability/skill-availability.module';
import { SkillTagsModule } from './modules/skill-tags/skill-tags.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TagActionRulesModule } from './modules/tag-action-rules/tag-action-rules.module';
import { TagsModule } from './modules/tags/tags.module';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { WorkLedgerModule } from './modules/work-ledger/work-ledger.module';
import { WorkspaceSettingsModule } from './modules/workspace-settings/workspace-settings.module';

@Module({
  controllers: [],
  exports: [
    AgentConversationsModule,
    AgentTokenUsageModule,
    CustomPromptsModule,
    DailyStatsModule,
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
    AgentConversationsModule,
    AgentTokenUsageModule,
    CustomPromptsModule,
    DailyStatsModule,
    LoggerModule,
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
