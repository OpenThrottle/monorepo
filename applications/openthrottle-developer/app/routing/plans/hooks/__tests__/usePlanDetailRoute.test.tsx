import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
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
  outputChunks: Promise.resolve([]),
  runHistory: Promise.resolve({
    planRunAuditRows: [{ isStale: false }],
    recentPlanRuns: [],
  }),
  tasks: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
  workspaceRepositories: Promise.resolve([]),
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
  test('derives status, resolved task count, and staleness from the seeds', async () => {
    const { value } = renderRoute();

    // Status and task count come from critical loader data: available on the
    // first render, with no await.
    expect(value.current?.status).toBe('IN_PROGRESS');
    expect(value.current?.resolvedTaskCount).toBe(1);
    expect(value.current?.fullscreen).toBe(false);
    expect(value.current?.isBoardView).toBe(false);

    // Staleness comes from deferred run history, so it is undefined until that
    // promise settles — the toolbar renders no badge in the meantime.
    expect(value.current?.newestRunIsStale).toBeUndefined();
    await waitFor(() => expect(value.current?.newestRunIsStale).toBe(false));
  });

  test('falls back to PENDING for an unrecognized plan status', () => {
    const { value } = renderRoute(undefined, ['/'], {
      ...basePlan,
      status: 'SOME_UNKNOWN_STATUS',
    });

    expect(value.current?.status).toBe('PENDING');
  });

  test('newestRunIsStale is undefined until run history resolves, then false when empty', async () => {
    const { value } = renderRoute(
      asType<UsePlanDetailRouteOptions['loaderData']>({
        outputChunks: Promise.resolve([]),
        runHistory: Promise.resolve({
          planRunAuditRows: [],
          recentPlanRuns: [],
        }),
        tasks: [],
        workspaceRepositories: Promise.resolve([]),
      }),
    );

    // 🚨 Three states, not two: "loading" must not be reported as "not stale".
    expect(value.current?.newestRunIsStale).toBeUndefined();
    expect(value.current?.resolvedTaskCount).toBe(0);

    await waitFor(() => expect(value.current?.newestRunIsStale).toBe(false));
  });

  test('newestUnsupervisedUnsettledRunId resolves to the newest run id only for an IN_PROGRESS run with no heartbeat', async () => {
    const { value } = renderRoute(
      asType<UsePlanDetailRouteOptions['loaderData']>({
        outputChunks: Promise.resolve([]),
        runHistory: Promise.resolve({
          planRunAuditRows: [
            {
              heartbeatExpected: false,
              id: 'run-newest',
              isStale: false,
              status: 'IN_PROGRESS',
            },
            {
              heartbeatExpected: false,
              id: 'run-older',
              isStale: false,
              status: 'IN_PROGRESS',
            },
          ],
          recentPlanRuns: [],
        }),
        tasks: [],
        workspaceRepositories: Promise.resolve([]),
      }),
    );

    // 🚨 Three states: "loading" must not read as "nothing to settle".
    expect(value.current?.newestUnsupervisedUnsettledRunId).toBeUndefined();

    await waitFor(() =>
      expect(value.current?.newestUnsupervisedUnsettledRunId).toBe(
        'run-newest',
      ),
    );
    // An interactive run never reads as stale — there is no heartbeat to expire.
    expect(value.current?.newestRunIsStale).toBe(false);
  });

  test.each([
    ['a supervised run', { heartbeatExpected: true, status: 'IN_PROGRESS' }],
    [
      'an already-settled interactive run',
      { heartbeatExpected: false, status: 'STALE' },
    ],
  ])('newestUnsupervisedUnsettledRunId is null for %s', async (_label, row) => {
    const { value } = renderRoute(
      asType<UsePlanDetailRouteOptions['loaderData']>({
        outputChunks: Promise.resolve([]),
        runHistory: Promise.resolve({
          planRunAuditRows: [{ id: 'run-1', isStale: false, ...row }],
          recentPlanRuns: [],
        }),
        tasks: [],
        workspaceRepositories: Promise.resolve([]),
      }),
    );

    await waitFor(() =>
      expect(value.current?.newestUnsupervisedUnsettledRunId).toBeNull(),
    );
  });

  test('newestUnsupervisedUnsettledRunId is null once an empty run history resolves', async () => {
    const { value } = renderRoute(
      asType<UsePlanDetailRouteOptions['loaderData']>({
        outputChunks: Promise.resolve([]),
        runHistory: Promise.resolve({
          planRunAuditRows: [],
          recentPlanRuns: [],
        }),
        tasks: [],
        workspaceRepositories: Promise.resolve([]),
      }),
    );

    expect(value.current?.newestUnsupervisedUnsettledRunId).toBeUndefined();
    await waitFor(() =>
      expect(value.current?.newestUnsupervisedUnsettledRunId).toBeNull(),
    );
  });

  test('isBoardView reflects the `view` search param', () => {
    const { value } = renderRoute(undefined, ['/?view=board']);

    expect(value.current?.isBoardView).toBe(true);
  });

  test('setFullscreen updates the returned fullscreen flag', async () => {
    const { value } = renderRoute();

    // Let the deferred promises settle first, so their state updates do not
    // land after the act() below and clobber the assertion.
    await waitFor(() => expect(value.current?.newestRunIsStale).toBe(false));

    act(() => value.current?.setFullscreen(true));

    expect(value.current?.fullscreen).toBe(true);
  });

  // 🚨 While workspaceRepositories is still resolving the run config is not
  // invalid, it is incomplete — so Run reports progress, not a validation error.
  test('blocks Run with a resolving reason until the workspace is ready', async () => {
    const { value } = renderRoute();

    expect(value.current?.workflowRunBlocked).toBe(true);
    expect(value.current?.workflowRunBlockedReason).toBe(
      'Resolving workspace…',
    );

    // Nothing flips the ready atom in this harness (no hydrator is mounted), so
    // the gate correctly stays closed rather than defaulting open.
    await waitFor(() => expect(value.current?.newestRunIsStale).toBe(false));
    expect(value.current?.workflowRunBlocked).toBe(true);
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
