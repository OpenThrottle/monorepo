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

  test('defines the step, status, title, and actions columns in order', () => {
    expect(columns).toHaveLength(4);
    expect(columns[0]?.id).toBe('step');
    expect(columns[1]).toMatchObject({ accessorKey: 'status' });
    expect(columns[2]).toMatchObject({ accessorKey: 'title' });
    expect(columns[3]?.id).toBe('actions');
  });

  describe('step column', () => {
    const stepColumn = columns[0];

    test('header renders a centered "#" label', () => {
      const header = stepColumn?.header;
      expect(typeof header).toBe('function');
      const { getByText } = renderWithRoutes(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      );
      expect(getByText('#')).toBeTruthy();
    });

    test('cell renders a 1-based step index derived from the row index', () => {
      const cell = stepColumn?.cell;
      expect(typeof cell).toBe('function');
      const { getByLabelText, getByText } = renderWithRoutes(
        typeof cell === 'function'
          ? cell(buildCellContext(buildTask(), 4))
          : null,
      );
      expect(getByLabelText('Step 5')).toBeTruthy();
      expect(getByText('#5')).toBeTruthy();
    });
  });

  describe('status column', () => {
    const statusColumn = columns[1];

    test('header renders a centered "Status" label', () => {
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

  describe('title column', () => {
    const titleColumn = columns[2];

    test('header renders "Title / Context"', () => {
      const header = titleColumn?.header;
      expect(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      ).toBe('Title / Context');
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
    const actionsColumn = columns[3];

    test('header renders "Actions"', () => {
      const header = actionsColumn?.header;
      expect(
        typeof header === 'function' ? header(buildHeaderContext()) : null,
      ).toBe('Actions');
    });

    test('cell renders the inline actions for the row task', () => {
      const cell = actionsColumn?.cell;
      const { getByRole } = renderWithRoutes(
        typeof cell === 'function' ? cell(buildCellContext(buildTask())) : null,
      );
      expect(
        getByRole('link', { name: /view task: first task/i }),
      ).toBeTruthy();
    });
  });
});
