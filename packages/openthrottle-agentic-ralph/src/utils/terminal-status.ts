/**
 * Plan/task statuses Ralph treats as resolved and terminal: `COMPLETED`, `SKIPPED`,
 * and `PROMOTED` (the work continued as its own plan, so it is resolved here but not
 * complete). `CANCELED` is deliberately absent (existing behaviour). This is the single
 * edit site for the next status addition; `@openthrottle/nestjs-repositories` owns the
 * server-side `PLAN_STATUS`/`TASK_STATUS` constants, which this CLI-facing package must
 * not depend on, so keep the two in step by hand.
 * @public
 */
export const RALPH_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'COMPLETED',
  'PROMOTED',
  'SKIPPED',
]);

/**
 * @description True when a plan or task status is terminal for Ralph's loop exit checks
 * ({@link RALPH_TERMINAL_STATUSES}). Used by the orchestrator's `workflow_plan_already_terminal`
 * guard and re-used by the `@tools/workflows` CLI so every effectively-complete check agrees.
 * @public
 */
export const isRalphTerminalStatus = (status: string): boolean =>
  RALPH_TERMINAL_STATUSES.has(status);
