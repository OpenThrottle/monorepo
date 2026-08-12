import type { PlanTaskStatus } from '~/__generated__/graphql';

/**
 * @description Canonical UI status key — the string-literal union of the
 * generated `PlanTaskStatus` GraphQL enum (the server-side SSOT). Using the
 * template-literal form (rather than the nominal enum) keeps raw 'BACKLOG'-style
 * literals assignable across the UI while still failing to compile if the enum
 * gains or loses a member.
 */
export type PlanStatusKey = `${PlanTaskStatus}`;

/**
 * @description Human-readable label for every plan/task status. Typed as
 * `Record<PlanStatusKey, string>` so it must stay exhaustive with the SSOT enum —
 * add a status upstream and this map fails to compile until a label is provided.
 * This is the single UI label source (consumed by the badge, chip, board columns,
 * status filter, and format-status).
 */
export const planStatusValues: Record<PlanStatusKey, string> = {
  BACKLOG: 'Backlog',
  BLOCKED: 'Blocked',
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SKIPPED: 'Skipped',
};
