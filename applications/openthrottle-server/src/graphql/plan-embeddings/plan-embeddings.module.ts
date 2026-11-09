/**
 * @description GraphQL module that registers PlanEmbeddingsResolver and PlanEmbeddingsLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanEmbeddingsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanEmbeddingsLoaders } from './loaders/loaders.service.ts';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanEmbeddingsLoaders, PlanEmbeddingsResolver],
})
export class PlanEmbeddingsGraphqlModule {}
