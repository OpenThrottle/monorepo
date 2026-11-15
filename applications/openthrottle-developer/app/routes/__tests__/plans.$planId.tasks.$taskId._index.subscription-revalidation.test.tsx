import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import TaskDetailRoute from '../plans.$planId.tasks.$taskId._index';

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

// Capture each graphql-ws subscription so the test can drive lifecycle payloads.
type Sink = { next: (msg: unknown) => void };
const subscriptions: Array<{ query: string; sink: Sink }> = [];
const fakeClient = {
  subscribe: (payload: { query: string }, sink: Sink) => {
    subscriptions.push({ query: payload.query, sink });
    return () => {
      return undefined;
    };
  },
};

vi.mock('~/services/getGraphqlWsClient', () => ({
  getGraphqlWsClient: () => fakeClient,
}));

const emitPlanLifecycle = (event: Record<string, unknown>): void => {
  for (const { query, sink } of subscriptions) {
    if (query.includes('planNotifications')) {
      sink.next({ data: { planNotifications: event } });
    }
  }
};

const loaderData = {
  linkedArtifacts: [],
  plan: null,
  planOutputChunks: [],
  tagVocabulary: [],
  task: {
    __typename: 'TaskObject' as const,
    afterHooks: [],
    assignee: null,
    beforeHooks: [],
    category: 'feature',
    createdAt: '2025-01-02T00:00:00Z',
    description: 'Task description',
    hookRole: null,
    id: 'task-1',
    planId: 'plan-1',
    projectRelation: null,
    requirementsJson: '[]',
    sortOrder: 1000,
    status: 'PENDING',
    summary: null,
    tags: [],
    title: 'A task',
    updatedAt: '2025-01-03T00:00:00Z',
  },
  trajectories: [],
};

async function renderTaskRoute(): Promise<void> {
  const RoutesStub = createRoutesStub([
    {
      Component: TaskDetailRoute,
      loader: () => loaderData,
      path: '/plans/:planId/tasks/:taskId',
    },
  ]);

  const component = render(
    <TooltipProvider>
      <RoutesStub initialEntries={['/plans/plan-1/tasks/task-1']} />
    </TooltipProvider>,
  );
  await component.findByText('A task');
}

describe('routes/plans.$planId.tasks.$taskId._index subscription revalidation', () => {
  beforeEach(() => {
    mockRevalidate.mockClear();
    subscriptions.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("subscribes to its plan's lifecycle stream", async () => {
    await renderTaskRoute();

    const lifecycle = subscriptions.find((s) =>
      s.query.includes('planNotifications'),
    );
    expect(lifecycle).toBeDefined();
  });

  test("revalidates when this task's status changes", async () => {
    await renderTaskRoute();

    emitPlanLifecycle({
      event: 'task.status_changed',
      planId: 'plan-1',
      taskId: 'task-1',
    });

    await vi.waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
  });

  test('revalidates when the plan status changes', async () => {
    await renderTaskRoute();

    emitPlanLifecycle({ event: 'plan.status_changed', planId: 'plan-1' });

    await vi.waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
  });

  test("ignores a sibling task's status change", async () => {
    await renderTaskRoute();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    emitPlanLifecycle({
      event: 'task.status_changed',
      planId: 'plan-1',
      taskId: 'task-2',
    });
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockRevalidate).not.toHaveBeenCalled();
  });
});
