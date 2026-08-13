import * as React from 'react';
import { act, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import type {
  UsePlanDetailRouteOptions,
  UsePlanDetailRouteResult,
} from '../usePlanDetailRoute';
import { usePlanDetailRoute } from '../usePlanDetailRoute';

// No ws client → the plan-output-stream and lifecycle-revalidation
// subscriptions never open a socket; these tests exercise the derived route
// state, not live streaming.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

/** Overloaded identity helper to launder a loose seed as a generated type. */
function asType<T>(value: unknown): T;
function asType(value: unknown): unknown {
  return value;
}

const basePlan = asType<UsePlanDetailRouteOptions['plan']>({
  author: 'visormatt',
  category: 'engineering',
  createdAt: '2026-01-01T00:00:00Z',
  id: 'plan-1',
  jobRunHooksJson: '',
  runConfigJson: '',
  status: 'IN_PROGRESS',
  title: 'Ship the thing',
  updatedAt: '2026-01-01T00:00:00Z',
});

const baseLoaderData = asType<UsePlanDetailRouteOptions['loaderData']>({
  planOutputChunks: [],
  planRunAuditRows: [{ isStale: false }],
  tasks: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
});

const baseParams = asType<UsePlanDetailRouteOptions['params']>({
  planId: 'plan-1',
});

function Harness(props: {
  readonly loaderData?: UsePlanDetailRouteOptions['loaderData'];
  readonly plan?: UsePlanDetailRouteOptions['plan'];
  readonly value: { current: UsePlanDetailRouteResult | null };
}): null {
  props.value.current = usePlanDetailRoute({
    loaderData: props.loaderData ?? baseLoaderData,
    params: baseParams,
    plan: props.plan ?? basePlan,
  });
  return null;
}

const renderRoute = (
  loaderData?: UsePlanDetailRouteOptions['loaderData'],
  initialEntries: string[] = ['/'],
  plan?: UsePlanDetailRouteOptions['plan'],
): {
  readonly component: ReturnType<typeof render>;
  readonly value: { current: UsePlanDetailRouteResult | null };
} => {
  const value: { current: UsePlanDetailRouteResult | null } = { current: null };
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp
      Component: () => (
        <Harness loaderData={loaderData} plan={plan} value={value} />
      ),
      path: '/',
    },
  ]);
  const component = render(<Stub initialEntries={initialEntries} />);
  return { component, value };
};

describe('usePlanDetailRoute', () => {
  test('derives status, resolved task count, and staleness from the seeds', () => {
    const { value } = renderRoute();

    expect(value.current?.status).toBe('IN_PROGRESS');
    expect(value.current?.resolvedTaskCount).toBe(1);
    expect(value.current?.newestRunIsStale).toBe(false);
    expect(value.current?.fullscreen).toBe(false);
    expect(value.current?.isBoardView).toBe(false);
  });

  test('falls back to PENDING for an unrecognized plan status', () => {
    const { value } = renderRoute(undefined, ['/'], {
      ...basePlan,
      status: 'SOME_UNKNOWN_STATUS',
    });

    expect(value.current?.status).toBe('PENDING');
  });

  test('newestRunIsStale defaults to false when there is no run history', () => {
    const { value } = renderRoute(
      asType<UsePlanDetailRouteOptions['loaderData']>({
        planOutputChunks: [],
        planRunAuditRows: [],
        tasks: [],
      }),
    );

    expect(value.current?.newestRunIsStale).toBe(false);
    expect(value.current?.resolvedTaskCount).toBe(0);
  });

  test('isBoardView reflects the `view` search param', () => {
    const { value } = renderRoute(undefined, ['/?view=board']);

    expect(value.current?.isBoardView).toBe(true);
  });

  test('setFullscreen updates the returned fullscreen flag', () => {
    const { value } = renderRoute();

    act(() => value.current?.setFullscreen(true));

    expect(value.current?.fullscreen).toBe(true);
  });

  test('exposes the run-config editor handlers and toolbar fetcher', () => {
    const { value } = renderRoute();

    expect(typeof value.current?.onResetToDefaults).toBe('function');
    expect(typeof value.current?.onSaveJobRunHooks).toBe('function');
    expect(typeof value.current?.onSaveRunConfig).toBe('function');
    expect(value.current?.tagFetcher.state).toBe('idle');
    expect(value.current?.workingDirectory).toBe('');
  });
});
