/**
 * @description Defaults aligned with
 * `applications/openthrottle-developer/.../build-workflow-ralph-argv.ts` and
 * `tools/workflows` Ralph CLI parsers.
 */

export const PLAN_RUN_CONFIG_VERSION = 1;

export const DEFAULT_PLAN_RUN_RALPH_RUNNER = 'cursor';
export const DEFAULT_PLAN_RUN_RALPH_PROMPT = '/agents-ralph';
export const DEFAULT_PLAN_RUN_RALPH_ITERATIONS = 10;
export const DEFAULT_PLAN_RUN_RALPH_MODEL = 'auto';

/**
 * @description Programmatic plan runs log verbosely by default so the run output stream carries
 * the agent CLI's reasoning. See docs/openthrottle/plan-run-worktrees.md.
 */
export const DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI: 'omit' | 'debug' | 'verbose' =
  'verbose';

/**
 * @description Programmatic plan runs get a named worktree by default. `'named'` (rather than
 * `'flag-only'`) because OpenThrottle derives the name itself, so the path is known up front.
 */
export const DEFAULT_PLAN_RUN_RALPH_WORKTREE_CLI:
  'flag-only' | 'named' | 'omit' = 'named';

/** @description Prefix for a derived plan-run worktree name (`plan-<short plan id>`). */
export const PLAN_RUN_WORKTREE_NAME_PREFIX = 'plan-';

/** @description Characters of the plan UUID used in a derived worktree name. */
export const PLAN_RUN_WORKTREE_NAME_ID_LENGTH = 8;

export const PLAN_RUN_KNOWN_BACKENDS = ['claude', 'cursor'] as const;
export const PLAN_RUN_CONFIG_TARGET_MODES = ['plan', 'task'] as const;
export const PLAN_RUN_PROMPT_LAYERS = ['named', 'file'] as const;
export const PLAN_RUN_DEBUG_CLI = ['omit', 'debug', 'verbose'] as const;
export const PLAN_RUN_WORKTREE_CLI = ['flag-only', 'named', 'omit'] as const;

/** @description RFC 4122 UUID v4 — aligned with workflow-ralph plan/task validation. */
export const PLAN_RUN_CONFIG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_PLAN_RUN_CONFIG_JSON_LEN = 512_000;
export const MAX_PLAN_RUN_ITERATIONS = 1_000_000;
export const MAX_PLAN_RUN_RALPH_STRING_FIELD_LEN = 8192;
export const MAX_PLAN_RUN_WORKING_DIRECTORY_LEN = 4096;
