import * as React from 'react';
import { describe, expect, test } from 'vitest';
import type { CellContext, HeaderContext } from '@tanstack/react-table';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { buildPlanTabTasksColumns } from '../plan-tab-tasks-columns';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

type Cell = CellContext<PlanTaskRowFragment, string | null | undefined>;
type Header = HeaderContext<PlanTaskRowFragment, string | null | undefined>;

const buildTask = (
  overrides: Partial<PlanTaskRowFragment> = {},
): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  hookRole: null,
  id: 'task-1',
  planId: 'plan-1',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'First task',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const buildCellContext = (task: PlanTaskRowFragment, index = 0): Cell =>
  asMock<Cell>({
    row: { index, original: task },
  });

const buildHeaderContext = (): Header => asMock<Header>({});

const renderWithRoutes = (
  ui: React.ReactElement | null,
): ReturnType<typeof renderRoutesStub> => renderRoutesStub(ui ?? <></>);

describe('buildPlanTabTasksColumns', () => {
  const columns = buildPlanTabTasksColumns(new Set(['managed-task']));

  test('defines the status, details, and actions columns in order', () => {
    expect(columns).toHaveLength(3);
    expect(columns[0]).toMatchObject({ accessorKey: 'status' });
    expect(columns[1]).toMatchObject({ accessorKey: 'details' });
    expect(columns[2]?.id).toBe('actions');
  });

  describe('status column', () => {
    const statusColumn = columns[0];

    test('header renders the "Status" label', () => {
      const header = statusColumn?.header;
      const { getByText } = renderWithRoutes(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      );
      expect(getByText('Status')).toBeTruthy();
    });

    test('cell renders the PlanStatusBadge for a known status', () => {
      const cell = statusColumn?.cell;
      const { getByTestId, getByText } = renderWithRoutes(
        typeof cell === 'function'
          ? cell(buildCellContext(buildTask({ status: 'PENDING' })))
          : null,
      );
      expect(getByTestId('PlanStatusBadge')).toBeTruthy();
      expect(getByText('Pending')).toBeTruthy();
    });

    test('cell renders the raw status string when it is not a known status', () => {
      const cell = statusColumn?.cell;
      const { getByText } = renderWithRoutes(
        typeof cell === 'function'
          ? cell(buildCellContext(buildTask({ status: 'SOMETHING_ODD' })))
          : null,
      );
      expect(getByText('SOMETHING_ODD')).toBeTruthy();
    });
  });

  describe('details column', () => {
    const titleColumn = columns[1];

    test('header renders "Task Details"', () => {
      const header = titleColumn?.header;
      const { getByText } = renderWithRoutes(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      );
      expect(getByText('Task Details')).toBeTruthy();
    });

    test('cell marks the task as managed when its id is in managedTaskIds', () => {
      const cell = titleColumn?.cell;
      const { getByRole, getByText } = renderWithRoutes(
        typeof cell === 'function'
          ? cell(buildCellContext(buildTask({ id: 'managed-task' })))
          : null,
      );
      expect(
        getByRole('link', { name: /scroll to task: first task/i }),
      ).toBeTruthy();
      expect(getByText('Managed')).toBeTruthy();
    });

    test('cell renders an unmanaged task without the managed badge', () => {
      const cell = titleColumn?.cell;
      const { getByRole, queryByText } = renderWithRoutes(
        typeof cell === 'function'
          ? cell(buildCellContext(buildTask({ id: 'unmanaged-task' })))
          : null,
      );
      expect(
        getByRole('link', { name: /scroll to task: first task/i }),
      ).toBeTruthy();
      expect(queryByText('Managed')).toBeNull();
    });
  });

  describe('actions column', () => {
    const actionsColumn = columns.find((column) => column.id === 'actions');

    test('header renders Actions via GlobalPopoverActionsHeader', () => {
      const header = actionsColumn?.header;
      const { getByText } = renderWithRoutes(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      );
      expect(getByText('Actions')).toBeTruthy();
    });

    test('cell renders the GlobalPopover actions menu for the row task', () => {
      const cell = actionsColumn?.cell;
      const { getByRole } = renderWithRoutes(
        typeof cell === 'function' ? cell(buildCellContext(buildTask())) : null,
      );
      expect(
        getByRole('button', { name: /task actions for first task/i }),
      ).toBeTruthy();
    });
  });
});
