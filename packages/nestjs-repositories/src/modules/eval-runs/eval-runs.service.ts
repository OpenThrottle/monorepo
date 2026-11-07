import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Repository } from 'typeorm';

import { EvalGrade } from './eval-grade.entity.ts';
import { EvalRun } from './eval-run.entity.ts';
import { EVAL_RUN_STATUS } from './eval-runs.constants.ts';
import type {
  CreateEvalRunInput,
  EvalRunStatus,
  UpdateEvalRunStatusInput,
  UpsertEvalGradeInput,
  UpsertEvalTrialInput,
} from './eval-runs.types.ts';
import { EvalTrial } from './eval-trial.entity.ts';

const TERMINAL_STATUSES: readonly EvalRunStatus[] = [
  EVAL_RUN_STATUS.CANCELLED,
  EVAL_RUN_STATUS.COMPLETED,
  EVAL_RUN_STATUS.FAILED,
];

@Injectable()
export class EvalRunsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(EvalRun)
    private readonly evalRunRepository: Repository<EvalRun>,
    @InjectRepository(EvalTrial)
    private readonly evalTrialRepository: Repository<EvalTrial>,
    @InjectRepository(EvalGrade)
    private readonly evalGradeRepository: Repository<EvalGrade>,
  ) {
    this.logger.debug('🧩 eval-runs 🧩');
  }

  /**
   * @description Returns the TypeORM repository for eval_runs.
   */
  getRepository(): Repository<EvalRun> {
    return this.evalRunRepository;
  }

  /**
   * @description Records a run. Rejects with a foreign-key violation (23503) when the dataset does
   * not exist. `startedAt` is stamped when the run is created already running.
   */
  async createRun(input: CreateEvalRunInput): Promise<EvalRun> {
    const row = this.evalRunRepository.create({
      ...input,
      finishedAt: null,
      startedAt: input.status === EVAL_RUN_STATUS.RUNNING ? new Date() : null,
    });

    return this.evalRunRepository.save(row);
  }

  /**
   * @description Returns one run by id, or null when it does not exist.
   */
  async findRunById(id: string): Promise<EvalRun | null> {
    return this.evalRunRepository.findOne({ where: { id } });
  }

  /**
   * @description Lists a dataset's runs, newest first.
   */
  async findRunsByDataset(datasetId: string): Promise<EvalRun[]> {
    return this.evalRunRepository.find({
      order: { createdAt: 'DESC' },
      where: { datasetId },
    });
  }

  /**
   * @description Lists the grades of the given trials, oldest first. An empty id list returns an
   * empty list without querying.
   */
  async findGradesByTrials(trialIds: readonly string[]): Promise<EvalGrade[]> {
    if (trialIds.length === 0) return [];

    return this.evalGradeRepository.find({
      order: { createdAt: 'ASC', graderId: 'ASC' },
      where: { trialId: In([...trialIds]) },
    });
  }

  /**
   * @description Lists a run's trials ordered by attempt then creation time.
   */
  async findTrialsByRun(runId: string): Promise<EvalTrial[]> {
    return this.evalTrialRepository.find({
      order: { attempt: 'ASC', createdAt: 'ASC' },
      where: { runId },
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

    return this.evalRunRepository.save(run);
  }

  /**
   * @description Records one grader's verdict on a trial, or replaces the earlier row for the same
   * (trial, grader id, grader version) (`ON CONFLICT DO UPDATE`). Rejects with a foreign-key
   * violation (23503) when the trial does not exist and with a check violation when the verdict,
   * error reason or judge model rules in migration 147 are broken.
   */
  async upsertGrade(input: UpsertEvalGradeInput): Promise<EvalGrade> {
    await this.evalGradeRepository.upsert(
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

    return this.evalGradeRepository.findOneByOrFail({
      graderId: input.graderId,
      graderVersion: input.graderVersion,
      trialId: input.trialId,
    });
  }

  /**
   * @description Records one attempt, or replaces the earlier row for the same (run, case,
   * attempt) so a resumed run can re-record a usage_limited trial. Rejects with a foreign-key
   * violation (23503) when the run, case or trajectory does not exist.
   */
  async upsertTrial(input: UpsertEvalTrialInput): Promise<EvalTrial> {
    await this.evalTrialRepository.upsert(
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

    return this.evalTrialRepository.findOneByOrFail({
      attempt: input.attempt,
      caseId: input.caseId,
      runId: input.runId,
    });
  }
}
