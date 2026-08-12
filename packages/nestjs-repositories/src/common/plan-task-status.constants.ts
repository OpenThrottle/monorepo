/**
 * @description Canonical source of truth for the plan/task status vocabulary.
 *
 * Mirrors the Postgres `plan_task_status` enum (databases/migrations/028 defines
 * the base seven, 029 adds QUEUED). No TS `enum` per .cursor/rules — an `as const`
 * map. Every layer that needs the status vocabulary (entity column typing, the
 * GraphQL `registerEnumType`, resolver input validation) reads from here so the
 * DB enum, the schema, and the MCP tool contract can never silently diverge again.
 * A parity test (plan-task-status.constants.test.ts) asserts this set equals the
 * labels declared by the migrations and fails loudly on drift.
 *
 * Do NOT confuse this with the separate `plan_runs.status` run-lifecycle vocabulary
 * (PLAN_RUN_STATUS in modules/plan-runs/plan-runs.constants.ts), which legitimately
 * uses double-L `CANCELLED` and `FAILED` and is unrelated to `plan_task_status`.
 */

/**
 * @description Full `plan_task_status` membership — the values a plan may hold.
 * Matches the Postgres enum exactly (uppercase, single-L `CANCELED`). QUEUED is a
 * real enum member but is only ever written to plans (see {@link TASK_STATUS}).
 * @public
 */
export const PLAN_STATUS = {
  BACKLOG: 'BACKLOG',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SKIPPED: 'SKIPPED',
} as const;

/** @public */
export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

/**
 * @description Status values a task may hold — the same `plan_task_status` enum
 * minus QUEUED, which is plans-only (set when a plan's run is enqueued in BullMQ).
 * @public
 */
export const TASK_STATUS = {
  BACKLOG: 'BACKLOG',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  SKIPPED: 'SKIPPED',
} as const;

/** @public */
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/**
 * @description Every label of the Postgres `plan_task_status` enum (full
 * membership, QUEUED included). This is the set the parity test checks against the
 * migrations, and the set to register as the GraphQL enum.
 * @public
 */
export const PLAN_STATUS_VALUES: readonly PlanStatus[] =
  Object.values(PLAN_STATUS);

/**
 * @description Task-valid status labels (QUEUED excluded).
 * @public
 */
export const TASK_STATUS_VALUES: readonly TaskStatus[] =
  Object.values(TASK_STATUS);

const PLAN_STATUS_SET: ReadonlySet<string> = new Set(PLAN_STATUS_VALUES);
const TASK_STATUS_SET: ReadonlySet<string> = new Set(TASK_STATUS_VALUES);

/**
 * @description Type guard: true when `value` is exactly a canonical plan status
 * label (case-sensitive; callers normalize casing first when needed).
 * @public
 */
export function isPlanStatus(value: string): value is PlanStatus {
  return PLAN_STATUS_SET.has(value);
}

/**
 * @description Type guard: true when `value` is a canonical task status label
 * (QUEUED is rejected — it is plans-only).
 * @public
 */
export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUS_SET.has(value);
}

/**
 * @description Human-readable, comma-separated list of the valid plan statuses —
 * used to build actionable "unknown status" error messages at the resolver.
 * @public
 */
export const PLAN_STATUS_LIST = PLAN_STATUS_VALUES.join(', ');

/**
 * @description Human-readable, comma-separated list of the valid task statuses.
 * @public
 */
export const TASK_STATUS_LIST = TASK_STATUS_VALUES.join(', ');
