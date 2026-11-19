import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { EvalCase } from '../eval-cases/eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import type { CreateEvalDatasetInput } from './eval-datasets.types.ts';

/**
 * @description Data access for the openthrottle `eval_datasets` table on the default connection:
 * the `BaseRepository` CRUD plus the transactional dataset-with-cases create. A delete is a soft
 * delete. The old service's `create` and nullable `findById` are
 * {@link EvalDatasetsRepository.createDataset} and {@link EvalDatasetsRepository.findDatasetById}:
 * the inherited ones insert one bare row and throw `NotFoundException` on a miss.
 * @public
 */
@Injectable()
export class EvalDatasetsRepository extends BaseRepository<
  EvalDataset,
  CreateModelInput<EvalDataset>
> {
  protected readonly tableName = 'eval_datasets';

  constructor(
    @InjectRepository(EvalDataset)
    repository: Repository<EvalDataset>,
  ) {
    super(repository);
  }

  /**
   * @description Creates a dataset and all its cases in one transaction. The version is
   * max(version) + 1 for the (repository, name) pair over every row, soft-deleted ones included
   * (the unique index covers them, so a version number is never reused), or 1 for a new name, so
   * an existing dataset is never edited. Rejects with a foreign-key violation (23503) when the
   * repository or a case's source trajectory does not exist.
   */
  async createDataset(input: CreateEvalDatasetInput): Promise<EvalDataset> {
    return this.repository.manager.transaction(async (manager) => {
      const datasets = manager.getRepository(EvalDataset);
      const cases = manager.getRepository(EvalCase);
      const latest = await datasets.findOne({
        order: { version: 'DESC' },
        where: { name: input.name, repositoryId: input.repositoryId },
        withDeleted: true,
      });
      const dataset = await datasets.save(
        datasets.create({
          createdBy: input.createdBy,
          description: input.description,
          name: input.name,
          repositoryId: input.repositoryId,
          target: input.target,
          version: (latest?.version ?? 0) + 1,
        }),
      );

      await cases.save(
        input.cases.map((evalCase) => {
          return cases.create({
            datasetId: dataset.id,
            gold: evalCase.gold,
            input: evalCase.input,
            sourceTrajectoryId: evalCase.sourceTrajectoryId,
            split: evalCase.split,
          });
        }),
      );

      return dataset;
    });
  }

  /**
   * @description Returns one live dataset by id, or null when it does not exist.
   */
  async findDatasetById(id: string): Promise<EvalDataset | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Lists a repository's live datasets, newest first (so the latest version of a name
   * comes before older ones).
   */
  async findByRepository(repositoryId: string): Promise<EvalDataset[]> {
    return this.findBy({
      order: { createdAt: 'DESC', version: 'DESC' },
      where: { repositoryId },
    });
  }
}
