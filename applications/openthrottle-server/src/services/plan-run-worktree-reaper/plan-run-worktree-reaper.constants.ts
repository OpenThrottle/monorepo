/**
 * @description Values for the backstop sweep of plan-run worktrees that teardown-on-PR skipped.
 */

/** A terminal plan's worktree must have been idle this long before it is nominated (7 days). */
export const PLAN_RUN_WORKTREE_REAPER_AGE_FLOOR_MS = 7 * 24 * 60 * 60 * 1000;

/** At most this many worktrees are removed per tick; the rest wait for the next one. */
export const PLAN_RUN_WORKTREE_REAPER_MAX_REMOVALS_PER_TICK = 5;

/**
 * Env flag: the sweep only logs what it WOULD remove unless this is `false` / `0` / `off` / `no`.
 * Dry-run is the default for the first release, so its candidate list can be checked against the
 * real worktree set before it removes anything.
 */
export const PLAN_RUN_WORKTREE_REAPER_DRY_RUN_ENV = `OPENTHROTTLE_WORKTREE_REAPER_DRY_RUN`;

/** Plan statuses that mean no further run will reuse the worktree. */
export const PLAN_RUN_WORKTREE_REAPER_TERMINAL_PLAN_STATUSES: readonly string[] =
  ['CANCELED', 'COMPLETED', 'PROMOTED', 'SKIPPED'];

/**
 * Why a plan-run worktree was nominated. The teardown service's guards still decide.
 * - `PR_MERGED` / `PR_CLOSED` — the branch's PR is no longer open.
 * - `PLAN_MISSING` — no plan matches the worktree's `plan-<8>` id prefix.
 * - `PLAN_TERMINAL_IDLE` — the plan is terminal and idle past the age floor.
 * - `NO_WORK_IDLE` — HEAD has nothing beyond the default branch and is idle past the age floor.
 */
export const PLAN_RUN_WORKTREE_NOMINATION = {
  NO_WORK_IDLE: 'no-work-idle',
  PLAN_MISSING: 'plan-missing',
  PLAN_TERMINAL_IDLE: 'plan-terminal-idle',
  PR_CLOSED: 'pr-closed',
  PR_MERGED: 'pr-merged',
} as const;
