import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TaskEmbedding } from './task-embedding.entity.ts';
import { TaskEmbeddingsRepository } from './task-embeddings.repository.ts';

/**
 * @description Registers {@link TaskEmbedding} on the default connection and provides
 * {@link TaskEmbeddingsRepository}.
 * @public
 */
@Module({
  exports: [TaskEmbeddingsRepository],
  imports: [TypeOrmModule.forFeature([TaskEmbedding])],
  providers: [TaskEmbeddingsRepository],
})
export class TaskEmbeddingsModule {}
