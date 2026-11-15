import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/data/data.plan-detail-route-id';

import { buildPlanRunSchedule } from '../../testing/buildPlanRunSchedule';
import { usePlanRunSchedules } from '../usePlanRunSchedules';

const renderSchedules = (routeId: string | undefined) => {
  const schedule = buildPlanRunSchedule();
  const loaderData = { plan: { runSchedules: [schedule] } };
  const hook = renderHook(() => usePlanRunSchedules({}), {
    wrapper: ({ children }) => {
      const RoutesStub = createRoutesStub([
        {
          Component: () => <>{children}</>,
          id: routeId,
          loader: routeId === undefined ? undefined : () => loaderData,
          path: '/',
        },
      ]);

      return (
        <RoutesStub
          hydrationData={{
            loaderData: routeId === undefined ? {} : { [routeId]: loaderData },
          }}
        />
      );
    },
  });

  return { hook, schedule };
};

describe('usePlanRunSchedules', () => {
  test('returns the plan detail route loader schedules', () => {
    const { hook, schedule } = renderSchedules(PLAN_DETAIL_ROUTE_ID);

    expect(hook.result.current.schedules).toEqual([schedule]);
  });

  test('is empty outside the plan detail route instead of throwing', () => {
    const { hook } = renderSchedules(undefined);

    expect(hook.result.current.schedules).toEqual([]);
  });
});
