import * as React from 'react';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import type {
  PlanStatusChangedPayload,
  TaskStatusChangedPayload,
} from '@openthrottle/openthrottle-notifications';
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

type SocketHandler = (payload: unknown) => void;

const socketHandlers = new Map<string, SocketHandler[]>();

const mockSocket = {
  off: vi.fn((event: string, handler: SocketHandler) => {
    const list = socketHandlers.get(event) ?? [];
    socketHandlers.set(
      event,
      list.filter((registered) => registered !== handler),
    );
  }),
  on: vi.fn((event: string, handler: SocketHandler) => {
    const list = socketHandlers.get(event) ?? [];
    list.push(handler);
    socketHandlers.set(event, list);
  }),
};

vi.mock('@openthrottle/react-router-notifications', () => ({
  useNotificationsSocket: () => ({
    socket: mockSocket,
    status: 'connected' as const,
    subscribeToNotifications: () => () => {},
  }),
}));

const emitSocketEvent = (event: string, payload: unknown): void => {
  for (const handler of socketHandlers.get(event) ?? []) {
    handler(payload);
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

const planStatusPayload = (planId: string): PlanStatusChangedPayload => ({
  planId,
  status: 'COMPLETED',
  timestamp: '2025-01-03T00:00:00Z',
});

const taskStatusPayload = (planId: string): TaskStatusChangedPayload => ({
  planId,
  status: 'IN_PROGRESS',
  taskId: 'task-1',
  timestamp: '2025-01-03T00:00:00Z',
});

describe('routes/plans.$planId._index socket revalidation', () => {
  beforeEach(() => {
    mockRevalidate.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    socketHandlers.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('registers plan and task status_changed listeners on mount', () => {
    renderPlanDetail('plan-1');

    expect(mockSocket.on).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      expect.any(Function),
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      expect.any(Function),
    );
  });

  test('revalidates when plan.status_changed matches route planId', () => {
    renderPlanDetail('plan-1');

    emitSocketEvent(
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      planStatusPayload('plan-1'),
    );

    expect(mockRevalidate).toHaveBeenCalledTimes(1);
  });

  test('does not revalidate when plan.status_changed is for another plan', () => {
    renderPlanDetail('plan-1');

    emitSocketEvent(
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      planStatusPayload('other-plan'),
    );

    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  test('revalidates when task.status_changed matches route planId', () => {
    renderPlanDetail('plan-1');

    emitSocketEvent(
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      taskStatusPayload('plan-1'),
    );

    expect(mockRevalidate).toHaveBeenCalledTimes(1);
  });

  test('does not revalidate when task.status_changed is for another plan', () => {
    renderPlanDetail('plan-1');

    emitSocketEvent(
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      taskStatusPayload('other-plan'),
    );

    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  test('removes socket listeners on unmount', () => {
    const view = renderPlanDetail('plan-1');
    const planHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
    )?.[1] as SocketHandler | undefined;
    const taskHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
    )?.[1] as SocketHandler | undefined;

    expect(planHandler).toBeDefined();
    expect(taskHandler).toBeDefined();

    view.unmount();

    expect(mockSocket.off).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      planHandler,
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      taskHandler,
    );
  });
});
