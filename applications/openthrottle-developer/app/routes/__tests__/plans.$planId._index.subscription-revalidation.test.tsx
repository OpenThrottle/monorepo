import { getPublicEnv } from '@openthrottle/react-router-utils';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildPlanDetailLoaderData,
  renderWithPlanDetailRouteData,
} from '~/routing/plans/testing/plan-detail-route-data';
import PlanDetail from '../plans.$planId._index';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

type PlanDetailMatches = Route.ComponentProps['matches'];
type PlanDetailLoaderData = Route.ComponentProps['loaderData'];

/** Build a fully-typed `matches` tuple for the PlanDetail component (which ignores it). */
const buildPlanDetailMatches = (
  loaderData: PlanDetailLoaderData,
): PlanDetailMatches => {
  const rootData = {
    canonical: 'http://localhost/',
    env: getPublicEnv(),
    rootLoaderDiagnostics: {},
    rootLoaderFailure: null,
    serverHealth: {
      api: 'unconfigured',
      database: 'unconfigured',
      redis: 'unconfigured',
      websocket: 'unconfigured',
    },
    user: null,
    userLoadOk: true,
  };

  return [
    {
      handle: undefined,
      id: 'root',
      loaderData: rootData,
      params: {},
      pathname: '/',
    },
    {
      handle: undefined,
      id: 'routes/plans.$planId._index',
      loaderData,
      params: {},
      pathname: '/',
    },
  ];
};

const mockRevalidate = vi.fn();

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useRevalidator: () => ({
      revalidate: mockRevalidate,
      state: 'idle' as const,
    }),
  };
});

// Capture each graphql-ws subscription so the test can drive payloads.
type Sink = { next: (msg: unknown) => void };
const subscriptions: Array<{
  dispose: ReturnType<typeof vi.fn>;
  query: string;
  sink: Sink;
}> = [];
const fakeClient = {
  subscribe: (payload: { query: string }, sink: Sink) => {
    const dispose = vi.fn();
    subscriptions.push({ dispose, query: payload.query, sink });
    return dispose;
  },
};

vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => fakeClient,
}));

const emitPlanLifecycle = (event: { event: string; planId?: string }): void => {
  for (const { query, sink } of subscriptions) {
    if (query.includes('planNotifications')) {
      sink.next({ data: { planNotifications: event } });
    }
  }
};

const mockPlan = {
  __typename: 'PlanObject' as const,
  afterHooks: [],
  assignee: 'visormatt',
  author: 'visormatt',
  beforeHooks: [],
  category: 'feature',
  createdAt: '2025-01-01T00:00:00Z',
  description: 'Plan description',
  id: 'plan-1',
  jobRunHooksJson: JSON.stringify({ hooks: [] }),
  projectId: 'proj-1',
  projectRelation: {
    __typename: 'ProjectObject' as const,
    id: 'proj-1',
    name: 'Test Project',
  },
  runConfigJson: JSON.stringify({ version: 1 }),
  status: 'IN_PROGRESS',
  summary: 'Plan summary',
  tags: [],
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderPlanDetail(planId: string): ReturnType<typeof render> {
  const loaderData = buildPlanDetailLoaderData({
    plan: mockPlan,
    tasks: [],
  });
  return renderWithPlanDetailRouteData(
    <TooltipProvider>
      <PlanDetail
        actionData={undefined}
        loaderData={loaderData}
        matches={buildPlanDetailMatches(loaderData)}
        params={{ planId }}
      />
    </TooltipProvider>,
    loaderData,
    { initialEntries: ['/?view=table'] },
  );
}

describe('routes/plans.$planId._index subscription revalidation', () => {
  beforeEach(() => {
    mockRevalidate.mockClear();
    subscriptions.length = 0;
  });

  afterEach(() => vi.clearAllMocks());

  test('subscribes to the per-plan lifecycle subscription on mount', () => {
    renderPlanDetail('plan-1');
    expect(
      subscriptions.some((s) => s.query.includes('planNotifications')),
    ).toBe(true);
  });

  test('revalidates when a plan lifecycle notification arrives', () => {
    renderPlanDetail('plan-1');

    emitPlanLifecycle({ event: 'plan.status_changed', planId: 'plan-1' });

    expect(mockRevalidate).toHaveBeenCalledTimes(1);
  });

  test('revalidates on a task lifecycle notification (server already scoped by planId)', () => {
    renderPlanDetail('plan-1');

    emitPlanLifecycle({ event: 'task.status_changed', planId: 'plan-1' });

    expect(mockRevalidate).toHaveBeenCalledTimes(1);
  });

  test('tears down the lifecycle subscription on unmount', () => {
    const { unmount } = renderPlanDetail('plan-1');

    const lifecycle = subscriptions.find((s) =>
      s.query.includes('planNotifications'),
    );
    expect(lifecycle).toBeDefined();
    expect(lifecycle?.dispose).not.toHaveBeenCalled();

    unmount();

    expect(lifecycle?.dispose).toHaveBeenCalledTimes(1);
  });
});
