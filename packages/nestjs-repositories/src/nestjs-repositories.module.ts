import { Module } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PermissionsModule,
  RolesModule,
  ServiceAccountCredentialsModule,
  ServiceAccountsModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module.ts';
import { AgentTokenUsageModule } from './modules/agent-token-usage/agent-token-usage.module.ts';
import { AgentTrajectoriesModule } from './modules/agent-trajectories/agent-trajectories.module.ts';
import { EvalDatasetsModule } from './modules/eval-datasets/eval-datasets.module.ts';
import { EvalHumanLabelsModule } from './modules/eval-human-labels/eval-human-labels.module.ts';
import { EvalJudgeCalibrationsModule } from './modules/eval-judge-calibrations/eval-judge-calibrations.module.ts';
import { EvalRunsModule } from './modules/eval-runs/eval-runs.module.ts';
import { ProjectSkillsModule } from './modules/project-skills/project-skills.module.ts';
import { CustomPromptsModule } from './modules/prompts/prompts.module.ts';
import { RepositoriesModule } from './modules/repositories/repositories.module.ts';
import { ScheduledAgentJobsModule } from './modules/scheduled-agent-jobs/scheduled-agent-jobs.module.ts';
import { SkillAvailabilityModule } from './modules/skill-availability/skill-availability.module.ts';
import { TagActionRulesModule } from './modules/tag-action-rules/tag-action-rules.module.ts';
import { TagsModule } from './modules/tags/tags.module.ts';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module.ts';
import { WorkspaceSettingsModule } from './modules/workspace-settings/workspace-settings.module.ts';
import { getTypeOrmOptions } from './nestjs-repositories.utils.ts';

@Module({
  controllers: [],
  exports: [
    AgentConversationsModule,
    AgentTokenUsageModule,
    AgentTrajectoriesModule,
    CustomPromptsModule,
    EvalDatasetsModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    PermissionsModule,
    ProjectSkillsModule,
    RepositoriesModule,
    RolesModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    TagActionRulesModule,
    TagsModule,
    UserPreferencesModule,
    UsersModule,
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
    AgentTrajectoriesModule,
    CustomPromptsModule,
    EvalDatasetsModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    LoggerModule,
    PermissionsModule,
    ProjectSkillsModule,
    RepositoriesModule,
    RolesModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    SkillAvailabilityModule,
    TagActionRulesModule,
    TagsModule,
    UserPreferencesModule,
    UsersModule,
    WorkspaceSettingsModule,
  ],
  providers: [],
})
export class NestjsRepositoriesModule {}
