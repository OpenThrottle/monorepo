import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub, useRouteError } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  PLAN_DETAIL_ROUTE_ID,
  usePlanDetailRouteData,
} from '../usePlanDetailRouteData';

interface ProbeProps {
  readonly onResult: (data: unknown) => void;
}

function Probe({ onResult }: ProbeProps): null {
  onResult(usePlanDetailRouteData());
  return null;
}

function renderAtRoute(
  loaderData: Record<string, unknown> | undefined,
  onResult: (data: unknown) => void,
): void {
  const RoutesStub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp -- inline route component composing the module-level Probe
      Component: () => <Probe onResult={onResult} />,
      id: PLAN_DETAIL_ROUTE_ID,
      loader: () => loaderData ?? null,
      path: '/',
    },
  ]);

  render(
    <RoutesStub
      hydrationData={{ loaderData: { [PLAN_DETAIL_ROUTE_ID]: loaderData } }}
    />,
  );
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

describe('usePlanDetailRouteData', () => {
  test('returns the seeded loader data for the plan detail route', () => {
    const seed = { planId: 'plan-1', title: 'My Plan' };
    let captured: unknown;

    renderAtRoute(seed, (data) => {
      captured = data;
    });

    expect(captured).toEqual(seed);
  });

  test('throws when the route loader data is nullish', () => {
    let caught: unknown;

    // eslint-disable-next-line react/no-multi-comp -- captures the boundary error for this one test
    function ErrorBoundary(): null {
      caught = useRouteError();
      return null;
    }

    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- inline route component composing the module-level Probe
        Component: () => <Probe onResult={() => {}} />,
        ErrorBoundary,
        id: PLAN_DETAIL_ROUTE_ID,
        loader: () => null,
        path: '/',
      },
    ]);

    render(
      <RoutesStub
        hydrationData={{ loaderData: { [PLAN_DETAIL_ROUTE_ID]: null } }}
      />,
    );

    expect(isError(caught)).toBe(true);
    if (!isError(caught)) {
      throw new Error('expected the route error to be an Error instance');
    }
    expect(caught.message).toBe(
      `usePlanDetailRouteData must be used within the "${PLAN_DETAIL_ROUTE_ID}" route.`,
    );
  });
});
