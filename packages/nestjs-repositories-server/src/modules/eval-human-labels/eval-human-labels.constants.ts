/**
 * @description String literals written to `eval_human_labels.verdict` (CHECK-constrained TEXT,
 * migration 146). The SQL CHECK and this object must list the same values.
 * @public
 */

/**
 * A rater's judgement of a trajectory. These verdicts are the ground truth LLM judges are
 * calibrated against.
 * @public
 */
export const EVAL_LABEL_VERDICT = {
  fail: 'fail',
  pass: 'pass',
} as const;
