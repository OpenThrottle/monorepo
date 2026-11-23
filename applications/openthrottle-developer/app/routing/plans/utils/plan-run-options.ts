/**
 * @description Shared vocabulary for the plan run-config UI: defaults, the known agent
 * drivers, the run-options state shape with its supporting union types, and the small pure
 * helpers that seed and parse that state (`isUuid`, timeout parsing, the default and
 * diff-baseline factories). Kept dependency-light so the tuning mapper, validator and diff
 * labeller can all build on it.
 *
 * Only the options the OT Loop runner reads are modelled here: agent driver, model, effort,
 * per-run agent timeout, and the worktree (name, cleanup).
 */

import {
  DEFAULT_PLAN_RUN_DRIVER,
  DEFAULT_PLAN_RUN_EFFORT,
  DEFAULT_PLAN_RUN_MODEL,
  DEFAULT_PLAN_RUN_WORKTREE_CLEANUP,
} from '@openthrottle/openthrottle-plan-config';

/** RFC 9562 UUID (versions 1-8, so both v4 and the v7 ids new rows get). */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// One source of truth with the server and `plans.run_config`: these alias the shared
// `@openthrottle/openthrottle-plan-config` defaults rather than restating them, so the Configuration
// tab cannot drift from what a queued run actually gets.
export const DEFAULT_RUN_DRIVER = DEFAULT_PLAN_RUN_DRIVER;
export const DEFAULT_RUN_MODEL = DEFAULT_PLAN_RUN_MODEL;

/**
 * @description Same ids as the `openthrottle-drivers` `DRIVER_IDS` set (surfaced via
 * `WORKFLOW_RUNNER_IDS`). Hand-maintained here because this is browser code and must NOT import the
 * Node-only drivers package; keep it aligned when a driver is added.
 */
export const PLAN_RUN_KNOWN_DRIVERS = [
  'antigravity',
  'claude',
  'codex',
  'cursor',
  'grok',
  'opencode',
] as const;

/**
 * @description Short label for plan-run history and queue job detail (`cursor` | `claude` from the API).
 */
export const formatPlanRunDriverLabel = (
  driver: string | null | undefined,
): string => {
  if (driver === 'antigravity') {
    return 'Antigravity CLI';
  }
  if (driver === 'claude') {
    return 'Claude Code CLI';
  }
  if (driver === 'cursor') {
    return 'Cursor (cursor-agent)';
  }
  if (driver == null || driver === '') {
    return '—';
  }
  return driver;
};

/**
 * @description BullMQ queue name for plan-run jobs. Same as the server `PLANS_QUEUE_NAME` constant.
 */
export const PLAN_RUN_BULLMQ_QUEUE_NAME = 'Plans' as const;

/**
 * @description Path to the queue job detail route for a plan-run job id.
 */
export const planRunJobDetailPath = (jobId: string): string => {
  const q = encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME);
  const j = encodeURIComponent(jobId.trim());

  return `/queues/${q}/${j}`;
};

export type PlanRunTargetMode = 'plan' | 'task';

/**
 * @description What happens to a queued run's worktree when the run finishes: `'on-pr'` removes it
 * after a clean run that opened a PR (the branch is kept), `'keep'` always leaves it on disk.
 */
export type PlanRunWorktreeCleanup = 'keep' | 'on-pr';

/**
 * @description Agent driver id; must stay aligned with {@link PLAN_RUN_KNOWN_DRIVERS}.
 */
export type PlanRunDriverUi = (typeof PLAN_RUN_KNOWN_DRIVERS)[number];

export interface PlanRunOptions {
  readonly driver: PlanRunDriverUi;
  /** @description Reasoning-effort level (low|medium|high|extraHigh|max|ultra); empty = unset. */
  readonly effort: string;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly model: string;
  readonly planId: string;
  readonly targetMode: PlanRunTargetMode;
  readonly taskId: string;
  /** @description Server-side teardown of a queued run's worktree. */
  readonly worktreeCleanup: PlanRunWorktreeCleanup;
  readonly worktreeName: string;
}

/**
 * @description Returns true when `value` is a plausible plan/task UUID (versions 1-8).
 */
export const isUuid = (value: string): boolean => {
  return UUID_REGEX.test(value.trim());
};

/**
 * @description Parses the optional per-run agent timeout (seconds); an empty string omits it.
 */
export const parsePlanRunTimeoutSeconds = (raw: string): number | undefined => {
  const t = raw.trim();
  if (t === '') {
    return undefined;
  }

  const n = parseInt(t, 10);
  if (Number.isNaN(n) || n < 1) {
    return undefined;
  }

  return n;
};

/**
 * @description Initial form state; `planId` / `taskId` seed the run target when embedded on plan/task routes.
 */
export const getDefaultPlanRunOptions = (options?: {
  readonly planId?: string;
  readonly taskId?: string;
}): PlanRunOptions => {
  const planId = options?.planId?.trim() ?? '';
  const taskId = options?.taskId?.trim() ?? '';
  const targetMode: PlanRunTargetMode =
    taskId !== '' && planId === '' ? 'task' : 'plan';

  return {
    driver: DEFAULT_RUN_DRIVER,
    effort: DEFAULT_PLAN_RUN_EFFORT,
    iterationTimeoutSeconds: undefined,
    model: DEFAULT_RUN_MODEL,
    planId,
    targetMode,
    taskId,
    worktreeCleanup: DEFAULT_PLAN_RUN_WORKTREE_CLEANUP,
    // Blank means "derive plan-<short plan id> at enqueue". Every run gets a worktree.
    worktreeName: '',
  };
};

/**
 * @description Baseline tuning for “diff vs defaults” on the plan/task route: same
 * plan / task target as {@link input}, with every other field reset like
 * {@link getDefaultPlanRunOptions}.
 */
export const getPlanRunOptionsBaseline = (
  input: PlanRunOptions,
): PlanRunOptions => {
  const seeded = getDefaultPlanRunOptions({
    planId: input.planId,
    taskId: input.taskId,
  });

  return {
    ...seeded,
    planId: input.planId,
    targetMode: input.targetMode,
    taskId: input.taskId,
  };
};
