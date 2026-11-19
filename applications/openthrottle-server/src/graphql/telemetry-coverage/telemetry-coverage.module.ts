/**
 * @description GraphQL module for the telemetryCoverage query.
 */

import { Module } from '@nestjs/common';
import {
  NestjsRepositoriesServerModule,
  TelemetryHeartbeatsModule,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TelemetryCoverageResolver } from './telemetry-coverage.resolver.ts';

@Module({
  imports: [
    EffectiveUserResolutionModule,
    NestjsRepositoriesServerModule,
    TelemetryHeartbeatsModule,
  ],
  providers: [TelemetryCoverageResolver],
})
export class TelemetryCoverageGraphqlModule {}
