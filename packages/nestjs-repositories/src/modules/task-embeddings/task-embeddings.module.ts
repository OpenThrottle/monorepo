import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { TaskEmbedding } from './task-embedding.entity.ts';
import { TaskEmbeddingsService } from './task-embeddings.service.ts';

@Module({
  controllers: [],
  exports: [TaskEmbeddingsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([TaskEmbedding])],
  providers: [TaskEmbeddingsService],
})
export class TaskEmbeddingsModule {}
