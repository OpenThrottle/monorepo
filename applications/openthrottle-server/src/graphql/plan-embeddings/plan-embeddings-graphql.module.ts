/**
 * @description GraphQL module that registers PlanEmbeddingsResolver and imports NestjsRepositoriesModule for PlanEmbeddingsService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanEmbeddingsResolver],
})
export class PlanEmbeddingsGraphqlModule {}
