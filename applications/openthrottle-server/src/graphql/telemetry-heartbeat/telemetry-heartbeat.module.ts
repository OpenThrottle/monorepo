/**
 * @description GraphQL module for the coverage heartbeat ingest.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { TelemetryHeartbeatsModule } from '@openthrottle/nestjs-repositories-server';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TelemetryHeartbeatResolver } from './telemetry-heartbeat.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    LoggerModule,
    NotificationsModule,
    TelemetryHeartbeatsModule,
  ],
  providers: [TelemetryHeartbeatResolver],
})
export class TelemetryHeartbeatGraphqlModule {}
