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
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanTasksBoard } from '../PlanTasksBoard';
import type { PlanTasksBoardProps } from '../PlanTasksBoard';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

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
  status: 'PENDING',
  summary: null,
  title: 'Board task',
  updatedAt: '2025-01-02T00:00:00Z',
  ...overrides,
});

const renderBoard = (props: PlanTasksBoardProps) => {
  const Component = () => (
    <DndProvider backend={HTML5Backend}>
      <PlanTasksBoard {...props} />
    </DndProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

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
