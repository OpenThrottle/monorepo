/**
 * @description String literals written to `eval_grades` (CHECK-constrained TEXT, migration 147).
 * The SQL CHECKs and these objects must list the same values; they mirror `GraderKind` and
 * `GraderVerdict` in `@openthrottle/agentic-evals`.
 * @public
 */

/**
 * What produced a grade.
 * @public
 */
export const EVAL_GRADER_KIND = {
  CODE: 'code',
  HUMAN: 'human',
  JUDGE: 'judge',
} as const;

/**
 * A grader's answer. `error` means the grader could not decide, which is not the agent failing.
 * @public
 */
export const EVAL_GRADE_VERDICT = {
  ERROR: 'error',
  FAIL: 'fail',
  PASS: 'pass',
} as const;
