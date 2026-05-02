import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { PlanEmbedding } from './plan-embedding.entity';

@Injectable()
export class PlanEmbeddingsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(PlanEmbedding)
    private readonly planEmbeddingRepository: Repository<PlanEmbedding>,
  ) {
    this.logger.debug('🧩 plan-embeddings 🧩');
  }

  /**
   * @description Returns the TypeORM repository for plan_embeddings. Use for CRUD and queries.
   */
  getRepository(): Repository<PlanEmbedding> {
    return this.planEmbeddingRepository;
  }
}
