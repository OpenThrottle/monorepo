/**
 * @description Jest-style lifecycle phases for plan/task-scoped workflow hooks.
 * Transport-free contract consumed by orchestrators and BullMQ child-job dispatchers.
 */

/** @description Plan-scoped phases run once per plan run. */
export type WorkflowPlanLifecyclePhase = 'afterAll' | 'beforeAll';

/** @description Task-scoped phases run per task transition. */
export type WorkflowTaskLifecyclePhase = 'afterEach' | 'beforeEach';

/** @description Task row context passed to beforeEach / afterEach hook invocations. */
export interface WorkflowLifecycleTaskContext {
  readonly category: string | undefined;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/** @description Terminal task outcome for afterEach condition filtering. */
export type WorkflowLifecycleTaskOutcome = 'blocked' | 'completed' | 'failed';

/**
 * @description Optional lifecycle dispatcher the orchestrator calls at plan/task boundaries.
 * Implementations enqueue BullMQ child jobs; the orchestrator stays transport-free.
 */
export interface WorkflowLifecycleDispatcher {
  /** @description Run plan-scoped children for a phase; resolves to whether the phase blocked. */
  readonly runPlan: (params: {
    readonly mainRunStarted?: boolean;
    readonly mainRunSucceeded?: boolean;
    readonly phase: WorkflowPlanLifecyclePhase;
  }) => Promise<{ readonly blocked: boolean }>;

  /** @description Run task-scoped children for a phase; resolves to whether the phase blocked that task. */
  readonly runTask: (params: {
    readonly phase: WorkflowTaskLifecyclePhase;
    readonly task: WorkflowLifecycleTaskContext;
    readonly taskOutcome?: WorkflowLifecycleTaskOutcome;
  }) => Promise<{ readonly blocked: boolean }>;
}

export interface LifecycleHooksChildJobsOptions {
  /**
   * @description Process env for the legacy env-only check. Ignored when
   * {@link lifecycleHooksChildJobs} is set (e.g. from {@link loadWorkflowRalphConfig} in `@tools/workflows`).
   */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * @description Resolved flag from file + env merge. When set, takes precedence over
   * `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS` alone.
   */
  readonly lifecycleHooksChildJobs?: boolean;
}

/**
 * @description When false, plan-run hooks run in-process (rollback for child-job orchestration).
 * Default: child BullMQ jobs on the orchestrator path.
 *
 * Precedence when callers pass {@link LifecycleHooksChildJobsOptions.lifecycleHooksChildJobs}:
 * that value wins (already merged from `.workflow-ralph.json` + env). Otherwise only
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
