/**
 * @description String literals written to `eval_runs` (CHECK-constrained TEXT, migration 147).
 * The SQL CHECKs and these objects must list the same values; they mirror `EvalAuthMode` in
 * `@openthrottle/agentic-evals`.
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
