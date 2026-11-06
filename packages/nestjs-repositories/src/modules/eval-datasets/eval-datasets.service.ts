import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';

import { EvalCase } from './eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import type { CreateEvalDatasetInput } from './eval-datasets.types.ts';

@Injectable()
export class EvalDatasetsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(EvalDataset)
    private readonly evalDatasetRepository: Repository<EvalDataset>,
    @InjectRepository(EvalCase)
    private readonly evalCaseRepository: Repository<EvalCase>,
  ) {
    this.logger.debug('🧩 eval-datasets 🧩');
  }

  /**
   * @description Returns the TypeORM repository for eval_datasets.
   */
  getRepository(): Repository<EvalDataset> {
    return this.evalDatasetRepository;
  }

  /**
   * @description Creates a dataset and all its cases in one transaction. The version is
   * max(version) + 1 for the (repository, name) pair, or 1 for a new name, so an existing dataset
   * is never edited. Rejects with a foreign-key violation (23503) when the repository or a case's
   * source trajectory does not exist.
   */
  async create(input: CreateEvalDatasetInput): Promise<EvalDataset> {
    return this.evalDatasetRepository.manager.transaction(async (manager) => {
      const datasets = manager.getRepository(EvalDataset);
      const cases = manager.getRepository(EvalCase);

      const latest = await datasets.findOne({
        order: { version: 'DESC' },
        where: { name: input.name, repositoryId: input.repositoryId },
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
   * @description Returns one dataset by id, or null when it does not exist.
   */
  async findById(id: string): Promise<EvalDataset | null> {
    return this.evalDatasetRepository.findOne({ where: { id } });
  }

  /**
   * @description Lists a dataset's cases by creation time.
   */
  async findCases(datasetId: string): Promise<EvalCase[]> {
    return this.evalCaseRepository.find({
      order: { createdAt: 'ASC', id: 'ASC' },
      where: { datasetId },
    });
  }

  /**
   * @description Lists a repository's datasets, newest first (so the latest version of a name
   * comes before older ones).
   */
  async findByRepository(repositoryId: string): Promise<EvalDataset[]> {
    return this.evalDatasetRepository.find({
      order: { createdAt: 'DESC', version: 'DESC' },
      where: { repositoryId },
    });
  }
}
