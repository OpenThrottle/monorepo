/**
 * @description Test harness for the plans.$planId._index route: renders an
 * element inside a {@link createRoutesStub} whose route carries the real
 * PLAN_DETAIL_ROUTE_ID and is hydrated with seed loader data, so components that
 * read server data through usePlanDetailRouteData() (PlanTabDetails, PlanTabTasks,
 * PlanTasksBoard, …) resolve it in isolation.
 *
 * The route carries a loader so its loaderData survives in-test navigations
 * (e.g. tab clicks that mutate search params trigger a revalidation); without one
 * React Router drops the seeded data on navigation and the hook throws.
 * hydrationData seeds the data so the initial render is synchronous; tests that
 * navigate must await the result (findBy queries or waitFor) since the loader
 * revalidation is async.
 */
import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/hooks/usePlanDetailRouteData';

/** Loose shape for seed loader data — tests provide only the fields they assert on. */
export type PlanDetailRouteDataSeed = Record<string, unknown>;

export const renderWithPlanDetailRouteData = (
  element: React.ReactElement,
  loaderData: PlanDetailRouteDataSeed,
  options?: { readonly initialEntries?: readonly string[] },
): RenderResult => {
  const Component = (): React.ReactElement => element;

  const RoutesStub = createRoutesStub([
    {
      Component,
      id: PLAN_DETAIL_ROUTE_ID,
      loader: () => loaderData,
      path: '/',
    },
  ]);

  return render(
    <RoutesStub
      hydrationData={{ loaderData: { [PLAN_DETAIL_ROUTE_ID]: loaderData } }}
      initialEntries={
        options?.initialEntries ? [...options.initialEntries] : undefined
      }
    />,
  );
};
