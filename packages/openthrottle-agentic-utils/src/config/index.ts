export const DEFAULT_WORKFLOW_DEBUG = 'omit';
export const DEFAULT_WORKFLOW_ITERATIONS = 10;
export const DEFAULT_WORKFLOW_RUNNER = 'cursor';

/**
 * Env var for Ralph execution backend (`cursor` | `claude`).
 */
export const WORKFLOW_RALPH_BACKEND_ENV = `WORKFLOW_RALPH_BACKEND`;

/**
 * Primary env var for Ralph workflow debug output (stderr).
 */
export const WORKFLOW_RALPH_DEBUG_ENV = `WORKFLOW_RALPH_DEBUG`;

/**
 * Legacy alias for {@link WORKFLOW_RALPH_DEBUG_ENV}.
 */
export const WORKFLOW_RALPH_DEBUG_LEGACY_ENV = `RALPH_DEBUG`;

/**
 * Explicit absolute path to the OpenThrottle monorepo root, used to locate
 * the `workflow-ralph` binary (`<root>/node_modules/.bin`) so nested spawns
 * resolve it deterministically — even when `cwd` is a foreign checkout and
 * the dev shell PATH is not inherited (clean/Docker envs). Set this when the
 * marker file (`pnpm-workspace.yaml`) is not reachable by walking up from the
 * module or `cwd`.
 */
export const WORKFLOW_RALPH_OT_ROOT_ENV = `WORKFLOW_RALPH_OT_ROOT`;

/**
 * When set, enables the noisiest debug lines (also accepts
 * `WORKFLOW_RALPH_DEBUG=2|verbose|all`).
 */
export const WORKFLOW_RALPH_VERBOSE_ENV = `WORKFLOW_RALPH_VERBOSE`;

/**
 * Known workflow runner ids; extend when adding a runner implementation.
 */
export const WORKFLOW_RUNNER_IDS = [`claude`, `cursor`, 'opencode'] as const;
