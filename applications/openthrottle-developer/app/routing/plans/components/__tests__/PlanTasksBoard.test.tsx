/**
 * Plan tasks board — component tests (grouping, regions, keyboard).
 *
 * Manual QA — socket revalidation (plan detail route):
 * - Open a plan with tasks, switch to Board view (`?view=board` or the Board toggle).
 * - In another client or via openthrottle-mcp, change a task status (or plan status) for the same plan id.
 * - Confirm the board updates after the `TASK_STATUS_CHANGED` / `PLAN_STATUS_CHANGED` socket event without a full reload
 *   (loader revalidates; table and board share the same `tasks` data).
 * - Repeat with Table view to confirm both views stay in sync.
 * - Drag a task card to another column: status should update (optimistic move), then match the server after the action; the
 *   `aria-live` region should announce moves and errors.
 */
import * as React from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanTasksBoard } from '../PlanTasksBoard';
import { renderWithPlanDetailRouteData } from '~/routing/plans/testing/plan-detail-route-data';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

// Spy on the toast boundary so we can assert the move-status effect fires
// exactly once per real busy->idle transition (never on a stale re-render).
const mockToast = vi.hoisted(() => ({
  dismiss: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

interface MockFetcher {
  data: unknown;
  state: 'idle' | 'loading' | 'submitting';
  submit: ReturnType<typeof vi.fn>;
}

// A controllable `useFetcher` return value the tests mutate to drive the
// submission through in-flight -> completed edges without a real drag-and-drop.
const fetcherRef = vi.hoisted((): { current: MockFetcher } => ({
  current: { data: undefined, state: 'idle', submit: vi.fn() },
}));

vi.mock('@openthrottle/react-router-shadcn', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-shadcn')>();
  return { ...actual, toast: mockToast };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useFetcher: () => fetcherRef.current };
});

// Forces the board to re-render so a mutated `fetcherRef` is observed.
let forceRerender: () => void = () => {};
const BoardHarness = (): React.ReactElement => {
  const [, setTick] = React.useState(0);
  forceRerender = () => setTick((tick) => tick + 1);
  return (
    <DndProvider backend={HTML5Backend}>
      <PlanTasksBoard />
    </DndProvider>
  );
};

const mockTask = (
  overrides: Partial<PlanTaskRowFragment>,
): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'Board task',
  updatedAt: '2025-01-02T00:00:00Z',
  ...overrides,
});

const renderBoard = (args: {
  planId: string;
  tasks: PlanTaskRowFragment[];
}): RenderResult =>
  renderWithPlanDetailRouteData(
    <DndProvider backend={HTML5Backend}>
      <PlanTasksBoard />
    </DndProvider>,
    {
      plan: { id: args.planId },
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: args.tasks,
    },
  );

describe('PlanTasksBoard Component', () => {
  test('exposes a live region for drag-and-drop announcements', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });

    expect(
      screen.getByTestId('PlanTasksBoard-a11y-announcement'),
    ).toHaveAttribute('aria-live', 'polite');
  });

  test('exposes the board as a group with an accessible name', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });

    expect(
      screen.getByRole('group', { name: 'Plan tasks board' }),
    ).toBeInTheDocument();
  });

  test('renders a status column region for each known status label', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });

    expect(screen.getByRole('region', { name: 'Backlog' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Queued' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pending' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'In Progress' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Blocked' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Completed' }),
    ).toBeInTheDocument();
  });

  test('places task cards under the column matching their status', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [
        mockTask({ id: 't-pending', status: 'PENDING', title: 'Alpha' }),
        mockTask({ id: 't-done', status: 'COMPLETED', title: 'Bravo' }),
      ],
    });

    const pendingRegion = screen.getByRole('region', { name: 'Pending' });
    const completedRegion = screen.getByRole('region', { name: 'Completed' });

    expect(
      within(pendingRegion).getByTestId('PlanTaskCard-t-pending'),
    ).toBeInTheDocument();
    expect(
      within(completedRegion).getByTestId('PlanTaskCard-t-done'),
    ).toBeInTheDocument();
    expect(
      within(pendingRegion).queryByTestId('PlanTaskCard-t-done'),
    ).not.toBeInTheDocument();
  });

  test('renders an Other column when a task has an unknown status', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [
        mockTask({
          id: 't-unknown',
          status: 'NOT_A_REAL_STATUS',
          title: 'Odd',
        }),
      ],
    });

    expect(screen.getByRole('region', { name: 'Other' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Other' })).getByTestId(
        'PlanTaskCard-t-unknown',
      ),
    ).toBeInTheDocument();
  });

  test('does not render an Other column when every status is known', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });

    expect(
      screen.queryByRole('region', { name: 'Other' }),
    ).not.toBeInTheDocument();
  });

  test('renders status columns and task cards grouped by status', () => {
    renderBoard({
      planId: 'plan-1',
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });

    expect(screen.getByTestId('PlanTasksBoard')).toBeInTheDocument();
    expect(screen.getByTestId('PlanTasksColumn-pending')).toBeInTheDocument();
    expect(screen.getByTestId('PlanTaskCard-a')).toBeInTheDocument();
  });

  test('moves focus to the task title link when tabbing into the board', async () => {
    const user = userEvent.setup();
    renderBoard({
      planId: 'plan-1',
      tasks: [
        mockTask({
          id: 'only-pending',
          status: 'PENDING',
          title: 'Focusable title',
        }),
      ],
    });

    await user.tab();

    expect(document.activeElement).toHaveAccessibleName(
      /open task: focusable title/i,
    );
  });
});

describe('PlanTasksBoard move-status toast (busy-edge guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetcherRef.current = { data: undefined, state: 'idle', submit: vi.fn() };
  });

  const renderHarness = (): void => {
    renderWithPlanDetailRouteData(<BoardHarness />, {
      plan: { id: 'plan-1' },
      planOutputChunks: [],
      planRunAuditRows: [],
      recentPlanRuns: [],
      tasks: [mockTask({ id: 'a', status: 'PENDING' })],
    });
  };

  test('fires the move-failed toast once on the busy->idle edge, never on a stale re-render', () => {
    renderHarness();

    // Submission goes in-flight: no toast yet.
    act(() => {
      fetcherRef.current = {
        data: undefined,
        state: 'submitting',
        submit: vi.fn(),
      };
      forceRerender();
    });
    expect(mockToast.error).not.toHaveBeenCalled();

    // Completes with an error -> the move-failed toast fires exactly once.
    act(() => {
      fetcherRef.current = {
        data: { updateTaskError: 'Move failed' },
        state: 'idle',
        submit: vi.fn(),
      };
      forceRerender();
    });
    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to move task: Move failed',
      {
        id: 'update-task-status',
      },
    );

    // A later unrelated re-render with the same completed data (new object ref,
    // still idle, no busy->idle transition) must NOT re-fire the toast.
    act(() => {
      fetcherRef.current = {
        data: { updateTaskError: 'Move failed' },
        state: 'idle',
        submit: vi.fn(),
      };
      forceRerender();
    });
    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });
});
