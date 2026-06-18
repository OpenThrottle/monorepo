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

/**
 * Auto-generated React Router v7 (`@react-router/fs-routes` flatRoutes) id for
 * app/routes/plans.$planId._index.tsx — the file path under app/ without the
 * extension. Centralized here so every consumer references one string.
 */
export const PLAN_DETAIL_ROUTE_ID = 'routes/plans.$planId._index' as const;

export type PlanDetailRouteData = NonNullable<
  ReturnType<typeof useRouteLoaderData<typeof loader>>
>;

/**
 * Returns the plan detail route's loader data. Throws if called outside the
 * plans.$planId._index route (where the loader has not run), which keeps the
 * return type non-nullable for the PlanTab* consumers.
 */
export function usePlanDetailRouteData(): PlanDetailRouteData {
  const data = useRouteLoaderData<typeof loader>(PLAN_DETAIL_ROUTE_ID);

  if (data == null) {
    throw new Error(
      `usePlanDetailRouteData must be used within the "${PLAN_DETAIL_ROUTE_ID}" route.`,
    );
  }

  return data;
}
