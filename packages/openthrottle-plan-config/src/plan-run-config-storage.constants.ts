/**
 * @description Defaults and bounds for `plans.run_config`. The defaults are the ones the developer
 * app's Configuration tab shows and every programmatic plan run inherits.
 */

export const PLAN_RUN_CONFIG_VERSION = 1;

export const DEFAULT_PLAN_RUN_DRIVER = 'cursor';
export const DEFAULT_PLAN_RUN_MODEL = 'auto';

/**
 * @description Empty effort means "unset": the run keeps the driver's own reasoning default and
 * no `tuning.effort` is sent at enqueue.
 */
export const DEFAULT_PLAN_RUN_EFFORT = '';

/**
 * @description Programmatic plan runs log verbosely by default so the run output stream carries
 * the agent CLI's reasoning. See docs/openthrottle/plan-run-worktrees.md.
 */
export const DEFAULT_PLAN_RUN_DEBUG_CLI: 'omit' | 'debug' | 'verbose' =
  `verbose`;

/**
 * @description What happens to a plan run's worktree after the run finishes. `'on-pr'` removes it
 * once the run completes cleanly with a PR (the branch is kept); `'keep'` always leaves it on disk.
 * Absent on a stored config means this default; a persisted value is a choice and is kept.
 */
export const DEFAULT_PLAN_RUN_WORKTREE_CLEANUP: 'keep' | 'on-pr' = `on-pr`;

/** @description Prefix for a derived plan-run worktree name (`plan-<short plan id>`). */
export const PLAN_RUN_WORKTREE_NAME_PREFIX = 'plan-';

/** @description Characters of the plan UUID used in a derived worktree name. */
export const PLAN_RUN_WORKTREE_NAME_ID_LENGTH = 8;

export const PLAN_RUN_KNOWN_DRIVERS = ['claude', 'cursor'] as const;
export const PLAN_RUN_CONFIG_TARGET_MODES = ['plan', 'task'] as const;
export const PLAN_RUN_DEBUG_CLI = ['omit', 'debug', 'verbose'] as const;
export const PLAN_RUN_WORKTREE_CLEANUP = ['keep', 'on-pr'] as const;

/** @description RFC 9562 UUID (versions 1-8, so both v4 and the v7 ids new rows get) for plan/task ids. */
export const PLAN_RUN_CONFIG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_PLAN_RUN_CONFIG_JSON_LEN = 512_000;
export const MAX_PLAN_RUN_STRING_FIELD_LEN = 8192;
export const MAX_PLAN_RUN_WORKING_DIRECTORY_LEN = 4096;

/** @description Upper bound the schema accepts for `run.maxRetries` (the runner clamps at run time). */
export const MAX_PLAN_RUN_OT_LOOP_RETRIES = 5;

/** @description Most commands accepted in one OT Loop command list. */
export const MAX_PLAN_RUN_OT_LOOP_COMMANDS = 50;
