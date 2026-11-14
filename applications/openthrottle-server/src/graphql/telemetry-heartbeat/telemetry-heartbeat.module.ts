/**
 * @description GraphQL module for the coverage heartbeat ingest.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TelemetryHeartbeatResolver } from './telemetry-heartbeat.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
  ],
  providers: [TelemetryHeartbeatResolver],
})
export class TelemetryHeartbeatGraphqlModule {}
