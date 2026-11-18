import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanEmbedding } from './plan-embedding.entity.ts';
import { PlanEmbeddingsRepository } from './plan-embeddings.repository.ts';

/**
 * @description Registers {@link PlanEmbedding} on the default connection and provides
 * {@link PlanEmbeddingsRepository}.
 * @public
 */
@Module({
  exports: [PlanEmbeddingsRepository],
  imports: [TypeOrmModule.forFeature([PlanEmbedding])],
  providers: [PlanEmbeddingsRepository],
})
export class PlanEmbeddingsModule {}
