import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module';
import { CommitLinksModule } from './modules/commit-links/commit-links.module';
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
import { RolesModule } from './modules/roles/roles.module';
import { ServiceAccountsModule } from './modules/service-accounts/service-accounts.module';
import { SkillAvailabilityModule } from './modules/skill-availability/skill-availability.module';
import { SkillTagsModule } from './modules/skill-tags/skill-tags.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TagActionRulesModule } from './modules/tag-action-rules/tag-action-rules.module';
import { TagsModule } from './modules/tags/tags.module';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { WorkspaceSettingsModule } from './modules/workspace-settings/workspace-settings.module';

@Module({
  controllers: [],
  exports: [
    AgentConversationsModule,
    CommitLinksModule,
    CustomPromptsModule,
    DailyStatsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectSkillsModule,
    ProjectsModule,
    RolesModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TagsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
    WorkspaceSettingsModule,
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): ReturnType<typeof getTypeOrmOptions> => {
        return getTypeOrmOptions();
      },
    }),
    AgentConversationsModule,
    CommitLinksModule,
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
    RolesModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    SkillTagsModule,
    SubscriptionsModule,
    TagActionRulesModule,
    TagsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
    WorkspaceSettingsModule,
  ],
  providers: [],
})
export class NestjsRepositoriesModule {}
