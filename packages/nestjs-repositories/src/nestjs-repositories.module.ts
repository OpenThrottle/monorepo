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

import { getTypeOrmOptions } from './nestjs-repositories.utils.ts';

@Module({
  controllers: [],
  exports: [
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
