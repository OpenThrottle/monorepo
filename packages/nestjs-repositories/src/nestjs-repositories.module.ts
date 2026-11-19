import { Module } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PermissionsModule,
  RepositoriesModule,
  RepositoryCheckoutsModule,
  RolesModule,
  ScheduledAgentJobRunsModule,
  ScheduledAgentJobsModule,
  ServiceAccountCredentialsModule,
  ServiceAccountsModule,
  UserPreferencesModule,
  UsersModule,
  UserWorkspaceSettingsModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentConversationsModule } from './modules/agent-conversations/agent-conversations.module.ts';
import { AgentTokenUsageModule } from './modules/agent-token-usage/agent-token-usage.module.ts';
import { AgentTrajectoriesModule } from './modules/agent-trajectories/agent-trajectories.module.ts';
import { EvalDatasetsModule } from './modules/eval-datasets/eval-datasets.module.ts';
import { EvalHumanLabelsModule } from './modules/eval-human-labels/eval-human-labels.module.ts';
import { EvalJudgeCalibrationsModule } from './modules/eval-judge-calibrations/eval-judge-calibrations.module.ts';
import { EvalRunsModule } from './modules/eval-runs/eval-runs.module.ts';
import { getTypeOrmOptions } from './nestjs-repositories.utils.ts';

@Module({
  controllers: [],
  exports: [
    AgentConversationsModule,
    AgentTokenUsageModule,
    AgentTrajectoriesModule,
    EvalDatasetsModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    PermissionsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
    RolesModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    UserPreferencesModule,
    UsersModule,
    UserWorkspaceSettingsModule,
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
    EvalDatasetsModule,
    EvalHumanLabelsModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    LoggerModule,
    PermissionsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
    RolesModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
    UserPreferencesModule,
    UsersModule,
    UserWorkspaceSettingsModule,
  ],
  providers: [],
})
export class NestjsRepositoriesModule {}
