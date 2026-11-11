import type { PlanStatus, TaskStatus } from './config.types.ts';

/**
 * @description Canonical source of truth for the plan/task status vocabulary.
 *
 * Mirrors the Postgres `plan_task_status` enum (databases/openthrottle/migrations/028 defines
 * the base seven, 029 adds QUEUED, 136 adds PROMOTED, 151 adds SCHEDULED). No TS `enum` per docs/monorepo/code-style.md — an `as const`
 * map. Every layer that needs the status vocabulary (entity column typing, the
 * GraphQL `registerEnumType`, resolver input validation) reads from here so the
 * DB enum, the schema, and the MCP tool contract can never silently diverge again.
 * A parity test (config.constants.test.ts) asserts this set equals the
 * labels declared by the migrations and fails loudly on drift.
 *
 * Do NOT confuse this with the separate `plan_runs.status` run-lifecycle vocabulary
 * (PLAN_RUN_STATUS in modules/plan-runs/plan-runs.constants.ts), which legitimately
 * uses double-L `CANCELLED` and `FAILED` and is unrelated to `plan_task_status`.
 */

/**
 * @description Full `plan_task_status` membership — the values a plan may hold.
 * Matches the Postgres enum exactly (uppercase, single-L `CANCELED`). QUEUED and
 * SCHEDULED are real enum members but are only ever written to plans (see
 * {@link TASK_STATUS}). SCHEDULED is server-written: a plan holds it exactly when it
 * has a SCHEDULED `plan_runs` row, and a manual status write of it is rejected.
 * @public
 */
export const PLAN_STATUS = {
  BACKLOG: 'BACKLOG',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  PROMOTED: 'PROMOTED',
  QUEUED: 'QUEUED',
  SCHEDULED: 'SCHEDULED',
  SKIPPED: 'SKIPPED',
} as const;
/**
 * @description Status values a task may hold — the same `plan_task_status` enum
 * minus QUEUED and SCHEDULED, which are plans-only (set when a plan's run is
 * enqueued in BullMQ, or scheduled for later).
 * @public
 */
export const TASK_STATUS = {
  BACKLOG: 'BACKLOG',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  PROMOTED: 'PROMOTED',
  SKIPPED: 'SKIPPED',
} as const;
/**
 * @description Every label of the Postgres `plan_task_status` enum (full
 * membership, QUEUED and SCHEDULED included). This is the set the parity test checks against the
 * migrations, and the set to register as the GraphQL enum.
 * @public
 */
export const PLAN_STATUS_VALUES: readonly PlanStatus[] =
  Object.values(PLAN_STATUS);

/**
 * @description Task-valid status labels (QUEUED and SCHEDULED excluded).
 * @public
 */
export const TASK_STATUS_VALUES: readonly TaskStatus[] =
  Object.values(TASK_STATUS);
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

/**
 * @description Task statuses that still count as unresolved for plan completion —
 * BLOCKED, IN_PROGRESS, PENDING, and QUEUED. COMPLETED, SKIPPED, CANCELED and
 * PROMOTED are terminal. Shared by `TasksService.hasRemainingTasks` and the
 * `PlanStatusService.applyStatusChange` COMPLETED guard so the two never drift.
 * QUEUED is included even though tasks rarely hold it (plans-only in practice).
 * @public
 */
export const REMAINING_TASK_STATUSES = [
  PLAN_STATUS.BLOCKED,
  PLAN_STATUS.IN_PROGRESS,
  PLAN_STATUS.PENDING,
  PLAN_STATUS.QUEUED,
] as const;
