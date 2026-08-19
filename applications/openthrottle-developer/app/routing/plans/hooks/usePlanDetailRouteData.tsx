/**
 * @description Typed accessor for the plans.$planId._index route loader data via
 * React Router's useRouteLoaderData, so the PlanTab* components read server data
 * directly instead of receiving it through props (eliminates prop-drilling from
 * the route shell). Mirrors the useRouteLoaderData<typeof loader> pattern at
 * app/root.tsx:239.
 *
 * The shape is derived from the generated GraphQL query rather than from the route
 * module's `loader`, so domain code never imports from `~/routes/*` — that direction
 * becomes a library→application cycle if `app/routing` is extracted (OT plan 88f747ff
 * task 8ab97f22). The route module annotates its loader with {@link PlanDetailRouteData},
 * so the contract and the loader cannot drift.
 */
import { useRouteLoaderData } from 'react-router';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';

/**
 * Auto-generated React Router v7 (`@react-router/fs-routes` flatRoutes) id for
 * app/routes/plans.$planId._index.tsx — the file path under app/ without the
 * extension. Centralized here so every consumer references one string.
 */
export const PLAN_DETAIL_ROUTE_ID = 'routes/plans.$planId._index' as const;

export interface PlanDetailRouteData {
  readonly linkedArtifacts: NonNullable<
    PlanDetailIndexLoaderQuery['workArtifactsByPlan']['artifacts']
  >;
  readonly plan: NonNullable<PlanDetailIndexLoaderQuery['plan']> | null;
  readonly planOutputChunks: PlanDetailIndexLoaderQuery['planOutputStreamChunks'];
  readonly planRunAuditRows: PlanDetailIndexLoaderQuery['planRunsByPlanId'];
  readonly recentPlanRuns: PlanDetailIndexLoaderQuery['metrics']['recentPlanRunsMetrics'];
  readonly ruleApplications: PlanDetailIndexLoaderQuery['ruleApplications'];
  readonly tagVocabulary: PlanDetailIndexLoaderQuery['skillTagVocabulary']['tags'];
  readonly tasks: PlanDetailIndexLoaderQuery['tasksByPlanId'];
  readonly workspaceRepositories: PlanDetailIndexLoaderQuery['workspaceRepositories'];
}

/**
 * Returns the plan detail route's loader data. Throws if called outside the
 * plans.$planId._index route (where the loader has not run), which keeps the
 * return type non-nullable for the PlanTab* consumers.
 */
export function usePlanDetailRouteData(): PlanDetailRouteData {
  const data = useRouteLoaderData<PlanDetailRouteData>(PLAN_DETAIL_ROUTE_ID);

  if (data == null) {
    throw new Error(
      `usePlanDetailRouteData must be used within the "${PLAN_DETAIL_ROUTE_ID}" route.`,
    );
  }

  return data;
}
