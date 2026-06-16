import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub, type UIMatch } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import PlanDetail from '../plans.$planId._index';

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
const subscriptions: Array<{ query: string; sink: Sink }> = [];
const fakeClient = {
  subscribe: (payload: { query: string }, sink: Sink) => {
    subscriptions.push({ query: payload.query, sink });
    return () => undefined;
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
  assignee: 'visormatt',
  author: 'visormatt',
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
  title: 'Test Plan',
  updatedAt: '2025-01-02T00:00:00Z',
};

function renderPlanDetail(planId: string): ReturnType<typeof render> {
  const Component = () => (
    <TooltipProvider>
      <PlanDetail
        actionData={undefined}
        loaderData={{
          plan: mockPlan,
          planOutputChunks: [],
          planRunAuditRows: [],
          recentPlanRuns: [],
          tasks: [],
        }}
        matches={[] as UIMatch[]}
        params={{ planId }}
      />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={['/?view=table']} />);
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
});
