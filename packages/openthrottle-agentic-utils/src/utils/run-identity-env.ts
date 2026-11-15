/**
 * @description The run identity an orchestrator hands the agent CLI it spawns, as env vars: which
 * plan, which `plan_runs` row and which task the attempt belongs to. A headless worker never calls
 * `register_plan_run` itself (the job or the detached CLI registers the run), so a hook running
 * inside it cannot find the run in its transcript; these variables are how it learns the run
 * instead. The plan-inbox claim hook is the first reader.
 */

/**
 * Env var names carrying the run identity into a spawned agent CLI.
 *
 * @public
 */
export const RUN_IDENTITY_ENV = {
  planId: 'OPENTHROTTLE_PLAN_ID',
  planRunId: 'OPENTHROTTLE_PLAN_RUN_ID',
  taskId: 'OPENTHROTTLE_TASK_ID',
} as const;

/**
 * The run an attempt belongs to. `planRunId` and `taskId` are `null` when the orchestrator has none
 * (an untracked TTY run, a plan-level iteration with no task picked yet).
 *
 * @public
 */
export interface RunIdentity {
  readonly planId: string;
  readonly planRunId: string | null;
  readonly taskId: string | null;
}

const blankIfMissing = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

/**
 * @description The env override for one spawned attempt. Every key is always present: a driver's
 * child env is `process.env` with these merged over it, so a key left out would let a value
 * inherited from a parent run leak into this one. An unknown part is an empty string, which
 * {@link readRunIdentityEnv} reads back as `null`.
 *
 * @public
 */
export const buildRunIdentityEnv = (identity: {
  readonly planId: string;
  readonly planRunId: string | null | undefined;
  readonly taskId: string | null | undefined;
}): Record<string, string> => {
  return {
    [RUN_IDENTITY_ENV.planId]: blankIfMissing(identity.planId),
    [RUN_IDENTITY_ENV.planRunId]: blankIfMissing(identity.planRunId),
    [RUN_IDENTITY_ENV.taskId]: blankIfMissing(identity.taskId),
  };
};

const presentOrNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

/**
 * @description The run identity in `env`, or `null` when no plan id is set (the process was not
 * spawned by an orchestrator).
 *
 * @public
 */
export const readRunIdentityEnv = (
  env: Readonly<Record<string, string | undefined>>,
): RunIdentity | null => {
  const planId = presentOrNull(env[RUN_IDENTITY_ENV.planId]);

  if (planId === null) {
    return null;
  }

  return {
    planId,
    planRunId: presentOrNull(env[RUN_IDENTITY_ENV.planRunId]),
    taskId: presentOrNull(env[RUN_IDENTITY_ENV.taskId]),
  };
};
