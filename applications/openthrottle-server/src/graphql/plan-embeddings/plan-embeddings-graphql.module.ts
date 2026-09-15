/**
 * @description GraphQL module that registers PlanEmbeddingsResolver and PlanEmbeddingsLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanEmbeddingsService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanEmbeddingsResolver } from './plan-embeddings.resolver.ts';
import { PlanEmbeddingsLoaders } from './plan-embeddings-loaders.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanEmbeddingsLoaders, PlanEmbeddingsResolver],
})
export class PlanEmbeddingsGraphqlModule {}
