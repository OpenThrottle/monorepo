/**
 * @description GraphQL module for databaseHealth and serverHealth. Imports NestjsRepositoriesModule for PlansService and PlansQueueProducerModule for Redis health.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { MetricsModule } from '../../metrics/metrics.module';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module';
import { HealthResolver } from './health.resolver';
import { HealthService } from './health.service';

@Module({
  exports: [HealthService],
  imports: [
    LoggerModule,
    MetricsModule,
    NestjsRepositoriesModule,
    PlansQueueProducerModule,
  ],
  providers: [HealthResolver, HealthService],
})
export class HealthGraphqlModule {}
