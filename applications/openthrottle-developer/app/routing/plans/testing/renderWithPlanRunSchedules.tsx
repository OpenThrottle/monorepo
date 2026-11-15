import { render, type RenderResult } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';

import type { PlanRunScheduleFieldsFragment } from '~/__generated__/graphql';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/data/data.plan-detail-route-id';

/**
 * @description Renders an element inside the plan detail route (real route id, seeded with the
 * given recurring schedules) at `/plans/plan-1`, so schedule-aware components resolve them and
 * fetcher forms posting to `/plans/plan-1` reach `action`.
 */
export const renderWithPlanRunSchedules = (
  element: React.ReactElement,
  options: {
    readonly action?: (formData: FormData) => unknown;
    readonly schedules: readonly PlanRunScheduleFieldsFragment[];
  },
): RenderResult => {
  const { action, schedules } = options;
  const loaderData = { plan: { runSchedules: schedules } };
  const Component = (): React.ReactElement => {
    return element;
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }) => {
        return action?.(await request.formData()) ?? null;
      },
      id: PLAN_DETAIL_ROUTE_ID,
      loader: () => loaderData,
      path: '/plans/:planId',
    },
  ]);

  return render(
    <RoutesStub
      hydrationData={{ loaderData: { [PLAN_DETAIL_ROUTE_ID]: loaderData } }}
      initialEntries={['/plans/plan-1']}
    />,
  );
};
