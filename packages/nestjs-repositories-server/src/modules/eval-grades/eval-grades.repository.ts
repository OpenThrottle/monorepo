import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { In, Repository } from 'typeorm';

import { EvalGrade } from './eval-grade.entity.ts';
import type { UpsertEvalGradeInput } from './eval-grades.types.ts';

/**
 * @description Data access for the openthrottle `eval_grades` table on the default connection: the
 * `BaseRepository` CRUD plus the re-recordable upsert and the per-trial listing. A grade is a
 * recorded result, so a delete is a hard delete and only an FK cascade does it.
 * @public
 */
@Injectable()
export class EvalGradesRepository extends BaseRepository<
  EvalGrade,
  CreateModelInput<EvalGrade>
> {
  protected readonly tableName = 'eval_grades';

  constructor(
    @InjectRepository(EvalGrade)
    repository: Repository<EvalGrade>,
  ) {
    super(repository);
  }

  /**
   * @description Lists the grades of the given trials, oldest first. An empty id list returns an
   * empty list without querying.
   */
  async findByTrials(trialIds: readonly string[]): Promise<EvalGrade[]> {
    if (trialIds.length === 0) return [];

    return this.findBy({
      order: { createdAt: 'ASC', graderId: 'ASC' },
      where: { trialId: In([...trialIds]) },
    });
  }

  /**
   * @description Records one grader's verdict on a trial, or replaces the earlier row for the same
   * (trial, grader id, grader version) (`ON CONFLICT DO UPDATE`). Rejects with a foreign-key
   * violation (23503) when the trial does not exist and with a check violation when the verdict,
   * error reason or judge model rules in migration 147 are broken.
   */
  async upsertGrade(input: UpsertEvalGradeInput): Promise<EvalGrade> {
    await this.repository.upsert(
      {
        cacheKey: input.cacheKey,
        costUsd: input.costUsd,
        errorReason: input.errorReason,
        evidence: input.evidence,
        graderId: input.graderId,
        graderKind: input.graderKind,
        graderVersion: input.graderVersion,
        judgeDriver: input.judgeDriver,
        judgeModel: input.judgeModel,
        judgeModelVersion: input.judgeModelVersion,
        trialId: input.trialId,
        verdict: input.verdict,
      },
      ['trialId', 'graderId', 'graderVersion'],
    );

    return this.repository.findOneByOrFail({
      graderId: input.graderId,
      graderVersion: input.graderVersion,
      trialId: input.trialId,
    });
  }
}
