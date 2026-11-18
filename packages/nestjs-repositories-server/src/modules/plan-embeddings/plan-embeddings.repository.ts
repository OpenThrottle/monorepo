import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { PlanEmbedding } from './plan-embedding.entity.ts';

/**
 * @description Data access for the openthrottle `plan_embeddings` table on the default
 * connection: the `BaseRepository` CRUD. A delete is a hard delete, since embeddings are
 * derived rows. The vector search itself is raw SQL in the server.
 * @public
 */
@Injectable()
export class PlanEmbeddingsRepository extends BaseRepository<
  PlanEmbedding,
  CreateModelInput<PlanEmbedding>
> {
  protected readonly tableName = 'plan_embeddings';

  constructor(
    @InjectRepository(PlanEmbedding)
    repository: Repository<PlanEmbedding>,
  ) {
    super(repository);
  }
}
