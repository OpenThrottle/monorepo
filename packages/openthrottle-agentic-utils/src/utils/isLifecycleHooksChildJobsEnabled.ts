import type { LifecycleHooksChildJobsOptions } from '../types/workflow-lifecycle.ts';

/**
 * When false, plan-run hooks run in-process (rollback for child-job orchestration).
 * Default: child BullMQ jobs on the orchestrator path.
 *
 * Precedence when callers pass {@link LifecycleHooksChildJobsOptions.lifecycleHooksChildJobs}:
 * that value wins (already merged from `.openthrottle/ot-loop.json` defaults + env). Otherwise only
 * `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS=false` disables child jobs.
 */
export const isLifecycleHooksChildJobsEnabled = (
  options?: LifecycleHooksChildJobsOptions,
): boolean => {
  if (options?.lifecycleHooksChildJobs !== undefined) {
    return options.lifecycleHooksChildJobs;
  }

  const env = options?.env ?? process.env;

  return env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS !== 'false';
};
