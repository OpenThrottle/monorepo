/**
 * Jest-style lifecycle phases for plan/task-scoped workflow hooks.
 * Transport-free contract consumed by orchestrators and BullMQ child-job dispatchers.
 */

/**
 * Plan-scoped phases run once per plan run.
 */
export type WorkflowPlanLifecyclePhase = 'afterAll' | 'beforeAll';

/**
 * Task-scoped phases run per task transition.
 */
export type WorkflowTaskLifecyclePhase = 'afterEach' | 'beforeEach';

/**
 * Task row context passed to beforeEach / afterEach hook invocations.
 */
export interface WorkflowLifecycleTaskContext {
  readonly category: string | undefined;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * Terminal task outcome for afterEach condition filtering.
 */
export type WorkflowLifecycleTaskOutcome = 'blocked' | 'completed' | 'failed';

/**
 * Optional lifecycle dispatcher the orchestrator calls at plan/task boundaries.
 * Implementations enqueue BullMQ child jobs; the orchestrator stays transport-free.
 */
export interface WorkflowLifecycleDispatcher {
  /**
   * Run plan-scoped children for a phase; resolves to whether the phase blocked.
   */
  readonly runPlan: (params: {
    readonly mainRunStarted?: boolean;
    readonly mainRunSucceeded?: boolean;
    readonly phase: WorkflowPlanLifecyclePhase;
  }) => Promise<{ readonly blocked: boolean }>;

  /**
   * Run task-scoped children for a phase; resolves to whether the phase blocked that task.
   */
  readonly runTask: (params: {
    readonly phase: WorkflowTaskLifecyclePhase;
    readonly task: WorkflowLifecycleTaskContext;
    readonly taskOutcome?: WorkflowLifecycleTaskOutcome;
  }) => Promise<{ readonly blocked: boolean }>;
}

export interface LifecycleHooksChildJobsOptions {
  /**
   * Process env for the legacy env-only check. Ignored when
   * {@link lifecycleHooksChildJobs} is set (e.g. from {@link loadWorkflowRalphConfig} in `@tools/workflows`).
   */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Resolved flag from file + env merge. When set, takes precedence over
   * `OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS` alone.
   */
  readonly lifecycleHooksChildJobs?: boolean;
}
