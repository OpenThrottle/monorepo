import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { EvalTrial } from './eval-trial.entity.ts';
import type { UpsertEvalTrialInput } from './eval-trials.types.ts';

/**
 * @description Data access for the openthrottle `eval_trials` table on the default connection: the
 * `BaseRepository` CRUD plus the re-recordable upsert and the per-run listing. A trial is a
 * recorded result, so a delete is a hard delete and only an FK cascade does it.
 * @public
 */
@Injectable()
export class EvalTrialsRepository extends BaseRepository<
  EvalTrial,
  CreateModelInput<EvalTrial>
> {
  protected readonly tableName = 'eval_trials';

  constructor(
    @InjectRepository(EvalTrial)
    repository: Repository<EvalTrial>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a run's trials ordered by attempt then creation time.
   */
  async findByRun(runId: string): Promise<EvalTrial[]> {
    return this.findBy({
      order: { attempt: 'ASC', createdAt: 'ASC' },
      where: { runId },
    });
  }

  /**
   * @description Records one attempt, or replaces the earlier row for the same (run, case,
   * attempt) so a resumed run can re-record a usage_limited trial. Rejects with a foreign-key
   * violation (23503) when the run, case or trajectory does not exist.
   */
  async upsertTrial(input: UpsertEvalTrialInput): Promise<EvalTrial> {
    await this.repository.upsert(
      {
        attempt: input.attempt,
        caseId: input.caseId,
        costUsd: input.costUsd,
        durationMs: input.durationMs,
        error: input.error,
        runId: input.runId,
        status: input.status,
        trajectoryId: input.trajectoryId,
      },
      ['runId', 'caseId', 'attempt'],
    );

    return this.repository.findOneByOrFail({
      attempt: input.attempt,
      caseId: input.caseId,
      runId: input.runId,
    });
  }
}
