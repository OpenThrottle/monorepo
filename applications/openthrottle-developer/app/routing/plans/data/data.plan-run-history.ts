/**
 * @description How many runs the plan-detail run history query fetches. Must equal the
 * `planRunsByPlanId(input: { limit: … })` literal in `app/routes/plans.$planId._index.tsx.graphql`
 * (GraphQL documents cannot import a constant); the history footer says "Showing the 25 most
 * recent runs" when exactly this many come back.
 */
export const PLAN_RUN_HISTORY_FETCH_LIMIT = 25;

/** @description The fields a run's meta line can show (see `buildPlanRunMetaItems`). */
export const PLAN_RUN_META_FIELDS = {
  backend: 'backend',
  effort: 'effort',
  model: 'model',
  workspace: 'workspace',
} as const;

export type PlanRunMetaField =
  (typeof PLAN_RUN_META_FIELDS)[keyof typeof PLAN_RUN_META_FIELDS];

/** @description Upcoming blocks show everything the run was scheduled with. */
export const PLAN_RUN_UPCOMING_META_FIELDS: readonly PlanRunMetaField[] = [
  PLAN_RUN_META_FIELDS.backend,
  PLAN_RUN_META_FIELDS.effort,
  PLAN_RUN_META_FIELDS.model,
  PLAN_RUN_META_FIELDS.workspace,
];

/** @description Latest run shows model · backend; provenance carries the workspace. */
export const PLAN_RUN_LATEST_META_FIELDS: readonly PlanRunMetaField[] = [
  PLAN_RUN_META_FIELDS.backend,
  PLAN_RUN_META_FIELDS.model,
];
