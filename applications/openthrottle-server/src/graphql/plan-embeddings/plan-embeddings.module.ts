/**
 * @description GraphQL module that registers PlanEmbeddingsResolver and PlanEmbeddingsLoaders (request-scoped DataLoaders) and imports the plan embeddings and plans table modules for PlanEmbeddingsRepository and PlansRepository.
 */

import { Module } from '@nestjs/common';
import {
  PlanEmbeddingsModule,
  PlansModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanEmbeddingsLoaders } from './loaders/loaders.service.ts';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver.ts';

@Module({
  imports: [PlanEmbeddingsModule, PlansModule],
  providers: [PlanEmbeddingsLoaders, PlanEmbeddingsResolver],
})
export class PlanEmbeddingsGraphqlModule {}
