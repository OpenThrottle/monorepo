import { useRouteLoaderData } from 'react-router';

import type { PlanRunScheduleFieldsFragment } from '~/__generated__/graphql';
import type { loader } from '~/routes/plans.$planId._index';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/data/data.plan-detail-route-id';

export interface UsePlanRunSchedulesOptions {}

export interface UsePlanRunSchedulesResult {
  readonly schedules: readonly PlanRunScheduleFieldsFragment[];
}

/**
 * @description The plan's recurring schedules from the plan detail route's loader data. Unlike
 * `usePlanDetailRouteData` it never throws: outside that route (a row action rendered
 * elsewhere, an isolated test) there are simply no schedules, so one-off behavior applies.
 */
export const usePlanRunSchedules = (
  _options: UsePlanRunSchedulesOptions,
): UsePlanRunSchedulesResult => {
  // Hooks
  const data = useRouteLoaderData<typeof loader>(PLAN_DETAIL_ROUTE_ID);

  // Setup
  const schedules = data?.plan?.runSchedules ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { schedules };
};
