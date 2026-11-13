/**
 * @description GraphQL module for the coverage heartbeat ingest.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TelemetryHeartbeatResolver } from './telemetry-heartbeat.resolver.ts';

@Module({
  imports: [EffectiveUserResolutionModule, NestjsRepositoriesModule],
  providers: [TelemetryHeartbeatResolver],
})
export class TelemetryHeartbeatGraphqlModule {}
