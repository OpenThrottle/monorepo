/**
 * @description Typed accessor for the plans.$planId._index route loader data via
 * React Router's useRouteLoaderData, so the PlanTab* components read server data
 * directly instead of receiving it through props (eliminates prop-drilling from
 * the route shell). Mirrors the useRouteLoaderData<typeof loader> pattern at
 * app/root.tsx:239.
 *
 * The loader is imported type-only, so the route→hook→route reference is erased
 * at build time and introduces no runtime import cycle.
 */
import { useRouteLoaderData } from 'react-router';

import type { loader } from '~/routes/plans.$planId._index';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/data/data.plan-detail-route-id';
import type { PlanDetailRouteData } from '~/routing/plans/types';

/**
 * Returns the plan detail route's loader data. Throws if called outside the
 * plans.$planId._index route (where the loader has not run), which keeps the
 * return type non-nullable for the PlanTab* consumers.
 */
export function usePlanDetailRouteData(): PlanDetailRouteData {
  // Hooks
  const data = useRouteLoaderData<typeof loader>(PLAN_DETAIL_ROUTE_ID);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (data == null) {
    throw new Error(
      `usePlanDetailRouteData must be used within the "${PLAN_DETAIL_ROUTE_ID}" route.`,
    );
  }

  return data;
}
