/**
 * @description GraphQL module for databaseHealth and serverHealth. Imports NestjsRepositoriesModule for PlansService and NestjsRedisModule for the dedicated Redis health-ping client.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { MetricsModule } from '../../metrics/metrics.module.ts';
import { EmbeddingsQueueProducerModule } from '../../queues/embeddings/producer/producer.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbeddingsHealthResolver } from './embeddings-health/embeddings-health.resolver.ts';
import { EmbeddingsHealthService } from './embeddings-health/embeddings-health.service.ts';
import { HealthResolver } from './health.resolver.ts';
import { HealthService } from './health.service.ts';

@Module({
  exports: [HealthService],
  imports: [
    EmbedderModule,
    EmbeddingsQueueProducerModule,
    LoggerModule,
    MetricsModule,
    NestjsRedisModule,
    NestjsRepositoriesModule,
  ],
  providers: [
    EmbeddingsHealthResolver,
    EmbeddingsHealthService,
    HealthResolver,
    HealthService,
  ],
})
export class HealthGraphqlModule {}
