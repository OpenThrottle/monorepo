import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Repository } from 'typeorm';

import { EvalCase } from '../eval-datasets/eval-case.entity.ts';
import { EvalHumanLabel } from '../eval-human-labels/eval-human-label.entity.ts';
import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';
import { EvalGrade } from '../eval-runs/eval-grade.entity.ts';
import { EVAL_GRADER_KIND } from '../eval-runs/eval-runs.constants.ts';
import { EvalTrial } from '../eval-runs/eval-trial.entity.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import type {
  CreateEvalJudgeCalibrationInput,
  EvalJudgeIdentity,
  EvalJudgePair,
  EvalJudgePairs,
  FindEvalJudgePairsInput,
} from './eval-judge-calibrations.types.ts';
import { consensusLabel } from './eval-judge-calibrations.utils.ts';

@Injectable()
export class EvalJudgeCalibrationsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(EvalJudgeCalibration)
    private readonly evalJudgeCalibrationRepository: Repository<EvalJudgeCalibration>,
    @InjectRepository(EvalTrial)
    private readonly evalTrialRepository: Repository<EvalTrial>,
    @InjectRepository(EvalGrade)
    private readonly evalGradeRepository: Repository<EvalGrade>,
    @InjectRepository(EvalCase)
    private readonly evalCaseRepository: Repository<EvalCase>,
    @InjectRepository(EvalHumanLabel)
    private readonly evalHumanLabelRepository: Repository<EvalHumanLabel>,
  ) {
    this.logger.debug('🧩 eval-judge-calibrations 🧩');
  }

  /**
   * @description Returns the TypeORM repository for eval_judge_calibrations.
   */
  getRepository(): Repository<EvalJudgeCalibration> {
    return this.evalJudgeCalibrationRepository;
  }

  /**
   * @description Records one calibration. History is append-only: re-calibrating inserts a new
   * row. Rejects with a foreign-key violation (23503) when the dataset or run does not exist.
   */
  async record(
    input: CreateEvalJudgeCalibrationInput,
  ): Promise<EvalJudgeCalibration> {
    const row = this.evalJudgeCalibrationRepository.create(input);

    return this.evalJudgeCalibrationRepository.save(row);
  }

  /**
   * @description Lists a grader's calibrations (every version), newest first.
   */
  async findByGrader(graderId: string): Promise<EvalJudgeCalibration[]> {
    return this.evalJudgeCalibrationRepository.find({
      order: { createdAt: 'DESC' },
      where: { graderId },
    });
  }

  /**
   * @description Pairs a run's judge grades with human labels so a calibration is one call. A
   * trial's label is the label on `trial.trajectoryId` (there is no trial_id on
   * eval_human_labels). Only grades of kind judge for the given grader id and version are read;
   * with `split`, only trials whose case is in that split. When several raters labelled a
   * trajectory they must agree, otherwise the trial is counted in `nConflicted`. Trials without a
   * trajectory or label are counted in `nUnlabeled`. Judge `error` grades are kept (the
   * calibration excludes and counts them).
   */
  async findJudgePairs(
    input: FindEvalJudgePairsInput,
  ): Promise<EvalJudgePairs> {
    const allTrials = await this.evalTrialRepository.find({
      where: { runId: input.runId },
    });
    const trials = await this.filterBySplit(allTrials, input.split);

    if (trials.length === 0) {
      return { judges: [], nConflicted: 0, nUnlabeled: 0, pairs: [] };
    }

    const grades = await this.evalGradeRepository.find({
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

    return this.evalHumanLabelRepository.find({
      where: { trajectoryId: In([...trajectoryIds]) },
    });
  }

  private async filterBySplit(
    trials: EvalTrial[],
    split: FindEvalJudgePairsInput['split'],
  ): Promise<EvalTrial[]> {
    if (split === null || trials.length === 0) return trials;

    const cases = await this.evalCaseRepository.find({
      where: { id: In(trials.map((trial) => trial.caseId)), split },
    });
    const caseIds = new Set(cases.map((evalCase) => evalCase.id));

    return trials.filter((trial) => caseIds.has(trial.caseId));
  }
}
