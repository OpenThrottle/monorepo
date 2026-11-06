/**
 * @description Types for judge calibrations (eval_judge_calibrations, migration 148) and the
 * judge/human pairing helper, shared by EvalJudgeCalibrationsService and its callers.
 */

import type { EvalSplit } from '../eval-datasets/eval-datasets.types.ts';
import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';
import type {
  EvalGradeVerdict,
  EvalJsonValue,
} from '../eval-runs/eval-runs.types.ts';
import type { EVAL_CALIBRATION_STATUS } from './eval-judge-calibrations.constants.ts';

/** @public */
export type EvalCalibrationStatus =
  (typeof EVAL_CALIBRATION_STATUS)[keyof typeof EVAL_CALIBRATION_STATUS];

/**
 * @description Everything needed to record one calibration. Rates and kappa are null when
 * undefined (an empty denominator, a constant rater).
 * @public
 */
export interface CreateEvalJudgeCalibrationInput {
  readonly catchRate: number | null;
  readonly createdBy: string;
  readonly datasetId: string | null;
  readonly falseFailRate: number | null;
  readonly graderId: string;
  readonly graderVersion: string;
  readonly heldOut: boolean;
  readonly judgeDriver: string | null;
  readonly judgeModel: string;
  readonly judgeModelVersion: string | null;
  readonly kappa: number | null;
  readonly kappaCiHigh: number | null;
  readonly kappaCiLow: number | null;
  readonly n: number;
  readonly nExcluded: number;
  readonly runId: string | null;
  readonly split: EvalSplit | null;
  readonly status: EvalCalibrationStatus;
}

/**
 * @description Which grades to pair: one grader (id and version) over one run, optionally only the
 * trials whose case sits in `split`.
 * @public
 */
export interface FindEvalJudgePairsInput {
  readonly graderId: string;
  readonly graderVersion: string;
  readonly runId: string;
  readonly split: EvalSplit | null;
}

/**
 * @description The identity of the judge behind a grade (driver, model, model version).
 * @public
 */
export interface EvalJudgeIdentity {
  readonly driver: string | null;
  readonly model: string;
  readonly modelVersion: string | null;
}

/**
 * @description One trial the judge graded and the humans labelled the same way. `subjectId` is the
 * trial id. `evidence` and `errorReason` come from the judge grade.
 * @public
 */
export interface EvalJudgePair {
  readonly errorReason: string | null;
  readonly evidence: EvalJsonValue;
  readonly human: EvalLabelVerdict;
  readonly judge: EvalGradeVerdict;
  readonly subjectId: string;
}

/**
 * @description The judge/human pairs of one run. `judges` lists every distinct judge identity seen
 * on the grades (a calibration is only meaningful for exactly one). `nConflicted` counts graded
 * trials whose raters disagreed with each other and `nUnlabeled` those with no trajectory or no
 * human label; neither is in `pairs`.
 * @public
 */
export interface EvalJudgePairs {
  readonly judges: readonly EvalJudgeIdentity[];
  readonly nConflicted: number;
  readonly nUnlabeled: number;
  readonly pairs: readonly EvalJudgePair[];
}
