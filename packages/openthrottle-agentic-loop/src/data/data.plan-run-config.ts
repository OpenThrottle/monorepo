import {
  PLAN_RUN_DEBUG_ENV,
  PLAN_RUN_OT_ROOT_ENV,
  PLAN_RUN_VERBOSE_ENV,
} from '@openthrottle/openthrottle-agentic-utils';

import { OT_LOOP_CONFIG_PATH } from './data.constants.ts';

/** @description Repo-local file (relative to the cwd) whose `defaults` block holds plan-run defaults. */
export const PLAN_RUN_DEFAULTS_FILENAME = OT_LOOP_CONFIG_PATH;

/** @description Key of the plan-run defaults block inside {@link PLAN_RUN_DEFAULTS_FILENAME}. */
export const PLAN_RUN_DEFAULTS_KEY = 'defaults';

/** @description Precedence documentation string; keep aligned with READMEs. */
export const PLAN_RUN_CONFIG_PRECEDENCE = `enqueue tuning → environment variables → ${OT_LOOP_CONFIG_PATH} "defaults" → built-in defaults`;

/** @description Environment variable names for the plan-run defaults. */
export const PLAN_RUN_ENV = {
  debug: PLAN_RUN_DEBUG_ENV,
  driver: 'OPENTHROTTLE_PLAN_RUN_DRIVER',
  iterationTimeout: 'OPENTHROTTLE_PLAN_RUN_ITERATION_TIMEOUT',
  lifecycleHooksChildJobs: 'OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS',
  model: 'OPENTHROTTLE_PLAN_RUN_MODEL',
  otRoot: PLAN_RUN_OT_ROOT_ENV,
  verbose: PLAN_RUN_VERBOSE_ENV,
  worktreeBase: 'OPENTHROTTLE_PLAN_RUN_WORKTREE_BASE',
} as const;
