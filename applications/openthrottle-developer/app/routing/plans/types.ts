import type { useRouteLoaderData } from 'react-router';

import type { PlanTaskStatus } from '~/__generated__/graphql';
import type { loader } from '~/routes/plans.$planId._index';

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
  PROMOTED: 'Promoted',
  QUEUED: 'Queued',
  SKIPPED: 'Skipped',
};

/**
 * @description Minimal plan shape the run-config editor reads to gate + seed
 * saves. Structurally satisfied by the route's loader plan.
 */
export interface PlanRunConfigEditorPlan {
  readonly id: string;
  readonly jobRunHooksJson?: string | null;
  readonly runConfigJson?: string | null;
}

/**
 * @description The plan detail route's loader data, as returned (non-null) by
 * `usePlanDetailRouteData`. The loader is imported type-only, so this adds no
 * runtime import cycle.
 */
export type PlanDetailRouteData = NonNullable<
  ReturnType<typeof useRouteLoaderData<typeof loader>>
>;
