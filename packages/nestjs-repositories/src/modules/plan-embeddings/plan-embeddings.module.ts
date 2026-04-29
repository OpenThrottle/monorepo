import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanEmbedding } from './plan-embedding.entity';
import { PlanEmbeddingsService } from './plan-embeddings.service';

@Module({
  controllers: [],
  exports: [PlanEmbeddingsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([PlanEmbedding])],
  providers: [PlanEmbeddingsService],
})
export class PlanEmbeddingsModule {}
