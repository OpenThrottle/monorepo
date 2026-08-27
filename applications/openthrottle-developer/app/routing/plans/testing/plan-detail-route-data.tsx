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
import type { PlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';

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

/**
 * Overloaded identity helper that launders a loose seed as the generated loader
 * type — the same trick `usePlanDetailRoute.test.tsx` uses, and the reason this
 * file needs no `as` cast (`.agents/rules`: avoid type assertions). Tests keep
 * seeding only the fields they assert on, while consumers still receive the
 * fully-typed shape their props require.
 */
function asPlanDetailRouteData(value: unknown): PlanDetailRouteData;
function asPlanDetailRouteData(value: unknown): unknown {
  return value;
}

/**
 * @description Builds a full plan-detail loader-data object for tests: the two
 * critical keys resolved, and every deferred key as an already-resolved promise
 * so `PlanDeferredSection` settles on the first microtask rather than parking on
 * a skeleton. Tests override only what they assert on.
 *
 * Pass a pending or rejected promise for a key to exercise that region's loading
 * or error state deliberately.
 */
export const buildPlanDetailLoaderData = (
  overrides: Readonly<Record<string, unknown>> = {},
): PlanDetailRouteData =>
  asPlanDetailRouteData({
    enabledEditors: Promise.resolve([]),
    ledger: Promise.resolve({ linkedArtifacts: [], ruleApplications: [] }),
    outputChunks: Promise.resolve([]),
    plan: null,
    runHistory: Promise.resolve({ planRunAuditRows: [], recentPlanRuns: [] }),
    tagVocabulary: Promise.resolve([]),
    tasks: [],
    workspaceRepositories: Promise.resolve([]),
    ...overrides,
  });
