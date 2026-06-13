/**
 * @description GraphQL module that registers PlanEmbeddingsResolver and PlanEmbeddingsLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanEmbeddingsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { PlanEmbeddingsLoaders } from './plan-embeddings-loaders';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanEmbeddingsLoaders, PlanEmbeddingsResolver],
})
export class PlanEmbeddingsGraphqlModule {}
