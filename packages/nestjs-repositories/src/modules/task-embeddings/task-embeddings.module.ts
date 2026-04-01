import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { TaskEmbedding } from './task-embedding.entity';
import { TaskEmbeddingsService } from './task-embeddings.service';

@Module({
  controllers: [],
  exports: [TaskEmbeddingsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([TaskEmbedding])],
  providers: [TaskEmbeddingsService],
})
export class TaskEmbeddingsModule {}
