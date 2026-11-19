import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { EvalRun } from './eval-run.entity.ts';
import { EVAL_RUN_STATUS } from './eval-runs.constants.ts';
import type {
  CreateEvalRunInput,
  EvalRunStatus,
  UpdateEvalRunStatusInput,
} from './eval-runs.types.ts';

const TERMINAL_STATUSES: readonly EvalRunStatus[] = [
  EVAL_RUN_STATUS.CANCELLED,
  EVAL_RUN_STATUS.COMPLETED,
  EVAL_RUN_STATUS.FAILED,
];

/**
 * @description Data access for the openthrottle `eval_runs` table on the default connection: the
 * `BaseRepository` CRUD plus the run record, the nullable lookup and the status move. A run is a
 * recorded result, so a delete is a hard delete and only an FK cascade does it. The old
 * service's `findRunById` keeps its name: it returns null on a miss, unlike the inherited
 * `findById`, which throws `NotFoundException`.
 * @public
 */
@Injectable()
export class EvalRunsRepository extends BaseRepository<
  EvalRun,
  CreateModelInput<EvalRun>
> {
  protected readonly tableName = 'eval_runs';

  constructor(
    @InjectRepository(EvalRun)
    repository: Repository<EvalRun>,
  ) {
    super(repository);
  }

  /**
   * @description Records a run. Rejects with a foreign-key violation (23503) when the dataset does
   * not exist. `startedAt` is stamped when the run is created already running.
   */
  async createRun(input: CreateEvalRunInput): Promise<EvalRun> {
    return this.create({
      ...input,
      finishedAt: null,
      startedAt: input.status === EVAL_RUN_STATUS.RUNNING ? new Date() : null,
    });
  }

  /**
   * @description Returns one run by id, or null when it does not exist.
   */
  async findRunById(id: string): Promise<EvalRun | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Lists a dataset's runs, newest first.
   */
  async findRunsByDataset(datasetId: string): Promise<EvalRun[]> {
    return this.findBy({
      order: { createdAt: 'DESC' },
      where: { datasetId },
    });
  }

  /**
   * @description Moves a run to a new status and returns it, or null when the run does not exist.
   * `startedAt` is stamped the first time the run is running; `finishedAt` is stamped on a terminal
   * status (completed, failed, cancelled) and cleared when the run goes back to a non-terminal one
   * (a resume after usage_limited).
   */
  async updateRunStatus(
    input: UpdateEvalRunStatusInput,
  ): Promise<EvalRun | null> {
    const run = await this.findRunById(input.runId);

    if (run == null) return null;

    run.status = input.status;

    if (input.status === EVAL_RUN_STATUS.RUNNING && run.startedAt == null) {
      run.startedAt = new Date();
    }

    run.finishedAt = TERMINAL_STATUSES.includes(input.status)
      ? new Date()
      : null;

    return this.repository.save(run);
  }
}
