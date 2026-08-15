/**
 * @description GraphQL module for databaseHealth and serverHealth. Imports NestjsRepositoriesModule for PlansService and NestjsRedisModule for the dedicated Redis health-ping client.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { Module } from '@nestjs/common';
import { MetricsModule } from '../../metrics/metrics.module';
import { HealthResolver } from './health.resolver';
import { HealthService } from './health.service';

@Module({
  exports: [HealthService],
  imports: [
    LoggerModule,
    MetricsModule,
    NestjsRedisModule,
    NestjsRepositoriesModule,
  ],
  providers: [HealthResolver, HealthService],
})
export class HealthGraphqlModule {}
