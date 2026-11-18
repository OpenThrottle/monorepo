import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { TaskEmbedding } from './task-embedding.entity.ts';

/**
 * @description Data access for the openthrottle `task_embeddings` table on the default
 * connection: the `BaseRepository` CRUD. A delete is a hard delete, since embeddings are
 * derived rows. The vector search itself is raw SQL in the server.
 * @public
 */
@Injectable()
export class TaskEmbeddingsRepository extends BaseRepository<
  TaskEmbedding,
  CreateModelInput<TaskEmbedding>
> {
  protected readonly tableName = 'task_embeddings';

  constructor(
    @InjectRepository(TaskEmbedding)
    repository: Repository<TaskEmbedding>,
  ) {
    super(repository);
  }
}
