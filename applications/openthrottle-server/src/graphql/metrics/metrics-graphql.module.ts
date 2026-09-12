/**
 * @description GraphQL module for metrics namespace. Exposes metrics { serverSnapshot, recentPlanRunsMetrics };
 * serverMetrics remains at root (HealthGraphqlModule) for backward compatibility.
 */

import { Module } from '@nestjs/common';

import { MetricsModule } from '../../metrics/metrics.module';
import { QueuesGraphqlModule } from '../queues/queues-graphql.module';
import { MetricsResolver } from './metrics.resolver';

@Module({
  imports: [MetricsModule, QueuesGraphqlModule],
  providers: [MetricsResolver],
})
export class MetricsGraphqlModule {}
