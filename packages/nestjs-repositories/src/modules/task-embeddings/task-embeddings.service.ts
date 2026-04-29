import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { TaskEmbedding } from './task-embedding.entity';

@Injectable()
export class TaskEmbeddingsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(TaskEmbedding)
    private readonly taskEmbeddingRepository: Repository<TaskEmbedding>,
  ) {
    this.logger.debug('🧩 task-embeddings 🧩');
  }

  /**
   * @description Returns the TypeORM repository for task_embeddings. Use for CRUD and queries.
   */
  getRepository(): Repository<TaskEmbedding> {
    return this.taskEmbeddingRepository;
  }
}
