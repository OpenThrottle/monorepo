/**
 * @description String literals written to `eval_judge_calibrations.status` (CHECK-constrained
 * TEXT, migration 148). The SQL CHECK and this object must list the same values; they mirror
 * `JudgeCalibrationStatus` in `@openthrottle/agentic-evals`.
 * @public
 */

/**
 * What a judge calibration allows: `unsupervised` at kappa >= 0.8, `gating` at >= 0.6,
 * `non_gating` below, `insufficient` when there are too few pairs.
 * @public
 */
export const EVAL_CALIBRATION_STATUS = {
  GATING: 'gating',
  INSUFFICIENT: 'insufficient',
  NON_GATING: 'non_gating',
  UNSUPERVISED: 'unsupervised',
} as const;
