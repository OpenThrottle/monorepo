/**
 * @description GraphQL module for cortexHealth and serverHealth. Imports NestjsRepositoriesModule for PlansService and PlansQueueModule for Redis health.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { MetricsModule } from '../../metrics/metrics.module';
import { PlansQueueModule } from '../../queues/plans/plans-queue.module';
import { HealthResolver } from './health.resolver';
import { HealthService } from './health.service';

@Module({
  exports: [HealthService],
  imports: [MetricsModule, NestjsRepositoriesModule, PlansQueueModule],
  providers: [HealthResolver, HealthService],
})
export class HealthGraphqlModule {}
