import type { LabelPair } from '../stats/agreement.ts';
import { catchRate, cohensKappa, falseFailRate } from '../stats/agreement.ts';
import type { BootstrapCiOptions } from '../stats/bootstrap-ci.ts';
import { bootstrapStatisticCi } from '../stats/bootstrap-ci.ts';
import type { GraderVerdict } from '../types/grader.ts';

/**
 * @description Where a judge may be trusted. `unsupervised` runs without a human check, `gating`
 * may block a change, `non_gating` is reported only, and `insufficient` means too few labels to
 * say anything yet.
 * @public
 */
export type JudgeCalibrationStatus =
  'gating' | 'insufficient' | 'non_gating' | 'unsupervised';

/**
 * @description One trial the judge and a human both labelled. `subjectId` is whatever identifies
 * the trial (a trajectory or trial id) and is carried for the caller only.
 * @public
 */
export interface JudgeCalibrationPair {
  readonly human: 'fail' | 'pass';
  readonly judge: GraderVerdict;
  readonly subjectId: string;
}

/**
 * @description Status cut-offs. Defaults come from the eval ADR (Decision 9): gating at kappa
 * 0.6, unsupervised at 0.8, and no status above `insufficient` below 20 usable pairs.
 * @public
 */
export interface JudgeCalibrationThresholds {
  readonly gatingKappa: number;
  readonly minPairs: number;
  readonly unsupervisedKappa: number;
}

/**
 * @description Input of {@link calibrateJudge}. `bootstrap` tunes the kappa interval; the default
 * is 10,000 resamples, 95% and a fixed seed, so a report is reproducible.
 * @public
 */
export interface CalibrateJudgeInput {
  readonly bootstrap?: BootstrapCiOptions;
  readonly pairs: readonly JudgeCalibrationPair[];
  readonly thresholds?: Partial<JudgeCalibrationThresholds>;
}

/**
 * @description The calibration of one judge against human labels. Rates are `null` when their
 * denominator is empty; `kappa` is `null` with no pairs or when either rater is constant.
 * `nExcluded` counts judge `error` verdicts, which are not agreement or disagreement. `n` counts
 * the pairs actually used.
 * @public
 */
export interface JudgeCalibration {
  readonly catchRate: number | null;
  readonly falseFailRate: number | null;
  readonly kappa: number | null;
  readonly kappaCiHigh: number | null;
  readonly kappaCiLow: number | null;
  readonly n: number;
  readonly nExcluded: number;
  readonly status: JudgeCalibrationStatus;
}

/**
 * @description The ADR's default thresholds.
 * @public
 */
export const DEFAULT_JUDGE_CALIBRATION_THRESHOLDS: JudgeCalibrationThresholds =
  {
    gatingKappa: 0.6,
    minPairs: 20,
    unsupervisedKappa: 0.8,
  };

// Floating point noise must not push a kappa of exactly 0.8 below the 0.8 bar.
const EPSILON = 1e-9;

const toLabelPairs = (pairs: readonly JudgeCalibrationPair[]): LabelPair[] => {
  const labelPairs: LabelPair[] = [];

  for (const pair of pairs) {
    if (pair.judge.kind !== 'error') {
      labelPairs.push({ human: pair.human, judge: pair.judge.kind });
    }
  }

  return labelPairs;
};

const resolveStatus = (
  n: number,
  kappa: number | null,
  thresholds: JudgeCalibrationThresholds,
): JudgeCalibrationStatus => {
  if (n < thresholds.minPairs) {
    return 'insufficient';
  }

  if (kappa === null) {
    return 'non_gating';
  }

  if (kappa + EPSILON >= thresholds.unsupervisedKappa) {
    return 'unsupervised';
  }

  return kappa + EPSILON >= thresholds.gatingKappa ? 'gating' : 'non_gating';
};

/**
 * @description Calibrates a judge against human labels: Cohen's kappa with a seeded bootstrap 95%
 * CI, catch rate (judge fails among human fails), false-fail rate (judge fails among human
 * passes), the pair count, the count of excluded judge `error` verdicts, and a gating status
 * (`unsupervised` at kappa >= 0.8, `gating` at >= 0.6, otherwise `non_gating`, and `insufficient`
 * below the minimum pair count regardless of kappa). Failure-type independent, so a judge and a
 * critic panel share it. An undefined kappa (a constant rater) is `non_gating` once there are enough pairs.
 * @public
 */
export const calibrateJudge = (
  input: CalibrateJudgeInput,
): JudgeCalibration => {
  const thresholds = {
    ...DEFAULT_JUDGE_CALIBRATION_THRESHOLDS,
    ...input.thresholds,
  };
  const labelPairs = toLabelPairs(input.pairs);
  const kappa = cohensKappa(labelPairs);
  const interval = bootstrapStatisticCi(
    labelPairs,
    cohensKappa,
    input.bootstrap,
  );
  const n = labelPairs.length;

  return {
    catchRate: catchRate(labelPairs),
    falseFailRate: falseFailRate(labelPairs),
    kappa,
    kappaCiHigh: interval?.upper ?? null,
    kappaCiLow: interval?.lower ?? null,
    n,
    nExcluded: input.pairs.length - n,
    status: resolveStatus(n, kappa, thresholds),
  };
};
