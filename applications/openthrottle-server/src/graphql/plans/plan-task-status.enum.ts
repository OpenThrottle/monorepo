/**
 * @description Registers the introspectable GraphQL enum `PlanTaskStatus` from the
 * canonical status SSOT (`PLAN_STATUS` in @openthrottle/nestjs-repositories). The
 * enum's members ARE the Postgres `plan_task_status` labels — there is no
 * hand-maintained literal list here; drift is impossible by construction (and the
 * SSOT's own parity test guards it against the DB migrations).
 *
 * QUEUED is a real enum member but is plans-only (set when a plan's run is enqueued
 * in BullMQ); tasks never take it. That distinction is semantic, not type-level, so
 * a single shared enum models both plan and task status.
 *
 * Not to be confused with the separate `plan_runs.status` run-lifecycle vocabulary
 * (CANCELLED double-L / FAILED / STALE), which is unrelated to `plan_task_status`.
 */

import { registerEnumType } from '@nestjs/graphql';
import {
  PLAN_STATUS,
  type PlanStatus,
} from '@openthrottle/nestjs-repositories';

registerEnumType(PLAN_STATUS, {
  description:
    'Canonical plan/task status vocabulary (the Postgres plan_task_status enum). ' +
    'QUEUED is plans-only. Sourced from the shared SSOT so the DB enum, GraphQL ' +
    'schema, and MCP tool contract cannot diverge.',
  name: 'PlanTaskStatus',
});

/**
 * @description The GraphQL enum reference (value namespace) — pass to `@Field`/
 * `@Query` type thunks, e.g. `@Field(() => PlanTaskStatus)`. In the type
 * namespace, `PlanTaskStatus` is the union of valid status labels.
 * @public
 */
export const PlanTaskStatus = PLAN_STATUS;

/** @public */
export type PlanTaskStatus = PlanStatus;
