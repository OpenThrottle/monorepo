/**
 * @description String literals written to the eval run, trial and grade tables (CHECK-constrained
 * TEXT, migration 147). The SQL CHECKs and these objects must list the same values; they mirror
 * `EvalAuthMode`, `EvalTrialStatus`, `GraderKind` and `GraderVerdict` in `@openthrottle/agentic-evals`.
 * @public
 */

/**
 * How the CLI was billed for a run.
 * @public
 */
export const EVAL_AUTH_MODE = {
  API_KEY: 'api_key',
  SUBSCRIPTION: 'subscription',
} as const;

/**
 * Run lifecycle. `usage_limited` is a resumable pause, not a failure.
 * @public
 */
export const EVAL_RUN_STATUS = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
  RUNNING: 'running',
  USAGE_LIMITED: 'usage_limited',
} as const;

/**
 * How one attempt ended. `usage_limited` is excluded from pass rates.
 * @public
 */
export const EVAL_TRIAL_STATUS = {
  COMPLETED: 'completed',
  ERRORED: 'errored',
  USAGE_LIMITED: 'usage_limited',
} as const;

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
