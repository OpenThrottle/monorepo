/**
 * @description GraphQL module for the telemetryCoverage query.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { TelemetryCoverageResolver } from './telemetry-coverage.resolver.ts';

@Module({
  imports: [EffectiveUserResolutionModule, NestjsRepositoriesModule],
  providers: [TelemetryCoverageResolver],
})
export class TelemetryCoverageGraphqlModule {}
