import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { EvalCase } from './eval-case.entity.ts';

/**
 * @description Data access for the openthrottle `eval_cases` table on the default connection: the
 * `BaseRepository` CRUD plus the per-dataset listing. A delete is a soft delete. Cases are
 * inserted with their dataset by `EvalDatasetsRepository.createDataset`.
 * @public
 */
@Injectable()
export class EvalCasesRepository extends BaseRepository<
  EvalCase,
  CreateModelInput<EvalCase>
> {
  protected readonly tableName = 'eval_cases';

  constructor(
    @InjectRepository(EvalCase)
    repository: Repository<EvalCase>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a dataset's live cases by creation time.
   */
  async findByDataset(datasetId: string): Promise<EvalCase[]> {
    return this.findBy({
      order: { createdAt: 'ASC', id: 'ASC' },
      where: { datasetId },
    });
  }
}
