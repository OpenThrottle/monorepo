import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { In, Repository } from 'typeorm';

import type { EvalCase } from '../eval-cases/eval-case.entity.ts';
import { EvalCasesRepository } from '../eval-cases/eval-cases.repository.ts';
import { EVAL_GRADER_KIND } from '../eval-grades/eval-grades.constants.ts';
import { EvalGradesRepository } from '../eval-grades/eval-grades.repository.ts';
import type { EvalHumanLabel } from '../eval-human-labels/eval-human-label.entity.ts';
import { EvalHumanLabelsRepository } from '../eval-human-labels/eval-human-labels.repository.ts';
import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';
import type { EvalTrial } from '../eval-trials/eval-trial.entity.ts';
import { EvalTrialsRepository } from '../eval-trials/eval-trials.repository.ts';
import { consensusLabel } from './consensus-label/consensus-label.utils.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import type {
  CreateEvalJudgeCalibrationInput,
  EvalJudgeIdentity,
  EvalJudgePair,
  EvalJudgePairs,
  FindEvalJudgePairsInput,
} from './eval-judge-calibrations.types.ts';

/**
 * @description Data access for the openthrottle `eval_judge_calibrations` table on the default
 * connection: the `BaseRepository` CRUD plus the append-only record, the per-grader history and
 * the judge/human pairing read. A calibration is a recorded result, so a delete is a hard delete.
 * The pairing read goes through the trial, grade, case and label repositories, so a soft-deleted
 * human label or case never counts.
 * @public
 */
@Injectable()
export class EvalJudgeCalibrationsRepository extends BaseRepository<
  EvalJudgeCalibration,
  CreateModelInput<EvalJudgeCalibration>
> {
  protected readonly tableName = 'eval_judge_calibrations';

  constructor(
    @InjectRepository(EvalJudgeCalibration)
    repository: Repository<EvalJudgeCalibration>,
    private readonly evalCasesRepository: EvalCasesRepository,
    private readonly evalGradesRepository: EvalGradesRepository,
    private readonly evalHumanLabelsRepository: EvalHumanLabelsRepository,
    private readonly evalTrialsRepository: EvalTrialsRepository,
  ) {
    super(repository);
  }

  /**
   * @description Records one calibration. History is append-only: re-calibrating inserts a new
   * row. Rejects with a foreign-key violation (23503) when the dataset or run does not exist.
   */
  async record(
    input: CreateEvalJudgeCalibrationInput,
  ): Promise<EvalJudgeCalibration> {
    return this.create(input);
  }

  /**
   * @description Lists a grader's calibrations (every version), newest first.
   */
  async findByGrader(graderId: string): Promise<EvalJudgeCalibration[]> {
    return this.findBy({
      order: { createdAt: 'DESC' },
      where: { graderId },
    });
  }

  /**
   * @description Pairs a run's judge grades with human labels so a calibration is one call. A
   * trial's label is the label on `trial.trajectoryId` (there is no trial_id on
   * eval_human_labels). Only grades of kind judge for the given grader id and version are read;
   * with `split`, only trials whose case is in that split. Soft-deleted labels and cases are
   * ignored. When several raters labelled a trajectory they must agree, otherwise the trial is
   * counted in `nConflicted`. Trials without a trajectory or label are counted in `nUnlabeled`.
   * Judge `error` grades are kept (the calibration excludes and counts them).
   */
  async findJudgePairs(
    input: FindEvalJudgePairsInput,
  ): Promise<EvalJudgePairs> {
    const allTrials = await this.evalTrialsRepository.findBy({
      where: { runId: input.runId },
    });
    const trials = await this.filterBySplit(allTrials, input.split);

    if (trials.length === 0) {
      return { judges: [], nConflicted: 0, nUnlabeled: 0, pairs: [] };
    }

    const grades = await this.evalGradesRepository.findBy({
      order: { createdAt: 'ASC' },
      where: {
        graderId: input.graderId,
        graderKind: EVAL_GRADER_KIND.JUDGE,
        graderVersion: input.graderVersion,
        trialId: In(trials.map((trial) => trial.id)),
      },
    });
    const trajectoryIds = trials.flatMap((trial) => {
      return trial.trajectoryId == null ? [] : [trial.trajectoryId];
    });
    const labels = await this.findLabels(trajectoryIds);
    const verdictsByTrajectory = new Map<string, EvalLabelVerdict[]>();

    for (const label of labels) {
      const verdicts = verdictsByTrajectory.get(label.trajectoryId) ?? [];

      verdicts.push(label.verdict);
      verdictsByTrajectory.set(label.trajectoryId, verdicts);
    }

    const trajectoryByTrial = new Map(
      trials.map((trial) => [trial.id, trial.trajectoryId]),
    );
    const judges = new Map<string, EvalJudgeIdentity>();
    const pairs: EvalJudgePair[] = [];
    let nConflicted = 0;
    let nUnlabeled = 0;

    for (const grade of grades) {
      const identity: EvalJudgeIdentity = {
        driver: grade.judgeDriver,
        model: grade.judgeModel ?? '',
        modelVersion: grade.judgeModelVersion,
      };

      judges.set(JSON.stringify(identity), identity);

      const trajectoryId = trajectoryByTrial.get(grade.trialId) ?? '';
      const verdicts = verdictsByTrajectory.get(trajectoryId) ?? [];
      const human = consensusLabel(verdicts);

      if (verdicts.length === 0) {
        nUnlabeled += 1;
      } else if (human === null) {
        nConflicted += 1;
      } else {
        pairs.push({
          errorReason: grade.errorReason,
          evidence: grade.evidence,
          human,
          judge: grade.verdict,
          subjectId: grade.trialId,
        });
      }
    }

    return {
      judges: [...judges.values()],
      nConflicted,
      nUnlabeled,
      pairs,
    };
  }

  private async findLabels(
    trajectoryIds: readonly string[],
  ): Promise<EvalHumanLabel[]> {
    if (trajectoryIds.length === 0) return [];

    return this.evalHumanLabelsRepository.findBy({
      where: { trajectoryId: In([...trajectoryIds]) },
    });
  }

  private async filterBySplit(
    trials: EvalTrial[],
    split: FindEvalJudgePairsInput['split'],
  ): Promise<EvalTrial[]> {
    if (split === null || trials.length === 0) return trials;

    const cases: EvalCase[] = await this.evalCasesRepository.findBy({
      where: { id: In(trials.map((trial) => trial.caseId)), split },
    });
    const caseIds = new Set(cases.map((evalCase) => evalCase.id));

    return trials.filter((trial) => caseIds.has(trial.caseId));
  }
}
