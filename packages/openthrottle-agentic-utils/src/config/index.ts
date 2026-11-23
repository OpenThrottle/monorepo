import {
  DEFAULT_DRIVER_ID,
  DRIVER_IDS,
} from '@openthrottle/openthrottle-drivers';

export const DEFAULT_WORKFLOW_DEBUG = 'omit';
export const DEFAULT_WORKFLOW_ITERATIONS = 10;

/** Default model id for a plan run; `auto` lets the driver pick. */
export const DEFAULT_PLAN_RUN_MODEL = 'auto';

/**
 * Default plan-run driver.
 * @deprecated Use {@link DEFAULT_DRIVER_ID} from `@openthrottle/openthrottle-drivers`.
 */
export const DEFAULT_WORKFLOW_RUNNER = DEFAULT_DRIVER_ID;

/**
 * Primary env var for plan-run debug output (stderr).
 */
export const PLAN_RUN_DEBUG_ENV = `OPENTHROTTLE_PLAN_RUN_DEBUG`;

/**
 * Explicit absolute path to the OpenThrottle monorepo root, used to locate
 * the OpenThrottle `node_modules/.bin` deterministically — even when `cwd` is a
 * foreign checkout and the dev shell PATH is not inherited (clean/Docker envs).
 * Set this when the marker file (`.openthrottle.mjs`) is not reachable by
 * walking up from the module or `cwd`.
 */
export const PLAN_RUN_OT_ROOT_ENV = `OPENTHROTTLE_PLAN_RUN_OT_ROOT`;

/**
 * When set, enables the noisiest debug lines (also accepts
 * `OPENTHROTTLE_PLAN_RUN_DEBUG=2|verbose|all`).
 */
export const PLAN_RUN_VERBOSE_ENV = `OPENTHROTTLE_PLAN_RUN_VERBOSE`;

/**
 * Known workflow runner ids.
 * @deprecated Use {@link DRIVER_IDS} from `@openthrottle/openthrottle-drivers`.
 */
export const WORKFLOW_RUNNER_IDS = DRIVER_IDS;

/**
 * Structured log event names for agentic workflow lifecycle lines (start/end).
 * Application code should emit JSON payloads that include correlation fields from
 * {@link WorkflowCorrelation} plus workflow-specific attributes at the app layer.
 */
export const WORKFLOW_EVENT = {
  JOB_RUN: 'job_run',
  METRIC: 'metric',
} as const;
