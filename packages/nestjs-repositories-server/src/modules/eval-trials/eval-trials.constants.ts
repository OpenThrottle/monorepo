/**
 * @description String literals written to `eval_trials.status` (CHECK-constrained TEXT, migration
 * 147). The SQL CHECK and this object must list the same values; they mirror `EvalTrialStatus` in
 * `@openthrottle/agentic-evals`.
 * @public
 */

/**
 * How one attempt ended. `usage_limited` is excluded from pass rates.
 * @public
 */
export const EVAL_TRIAL_STATUS = {
  COMPLETED: 'completed',
  ERRORED: 'errored',
  USAGE_LIMITED: 'usage_limited',
} as const;
