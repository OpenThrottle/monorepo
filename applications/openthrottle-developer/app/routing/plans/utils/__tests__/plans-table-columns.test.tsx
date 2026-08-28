import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { buildPlansTableColumns } from '../plans-table-columns';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { PLANS_ROW_ACTIONS_COPY } from '~/routing/plans/data/data.copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { CellContext, HeaderContext } from '@tanstack/react-table';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const cellContext = (
  plan: PlanCardFragment,
): CellContext<PlanCardFragment, string | number | null | undefined> =>
  asMock({ row: { original: plan } });

const headerContext = (): HeaderContext<
  PlanCardFragment,
  string | number | null | undefined
> => asMock({});

interface PlainPlanColumn {
  readonly accessorKey?: string;
  readonly cell?: (
    ctx: CellContext<PlanCardFragment, string | number | null | undefined>,
  ) => React.ReactNode;
  readonly header?:
    | string
    | ((
        ctx: HeaderContext<
          PlanCardFragment,
          string | number | null | undefined
        >,
      ) => React.ReactNode);
  readonly id?: string;
}

const asPlainColumn = (
  column: ReturnType<typeof buildPlansTableColumns>[number],
): PlainPlanColumn => asMock(column);

const buildPlan = (
  overrides: Partial<PlanCardFragment> = {},
): PlanCardFragment => ({
  __typename: 'PlanObject',
  assignee: null,
  author: 'visormatt',
  category: 'general',
  createdAt: '2026-01-01T00:00:00Z',
  description: null,
  hasCustomRunConfig: false,
  id: 'plan-1',
  project: null,
  projectRelation: null,
  status: 'PENDING',
  summary: null,
  tags: [],
  taskCount: 3,
  tasksCompletedCount: 0,
  title: 'My Plan',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
});

interface HarnessProps {
  readonly plan: PlanCardFragment;
}

function Harness(props: HarnessProps): React.ReactElement {
  const columns = buildPlansTableColumns({});
  const context = cellContext(props.plan);

  return (
    <div>
      {columns.map((column, index) => {
        const plain = asPlainColumn(column);
        return (
          <div
            data-testid={`cell-${plain.id ?? String(plain.accessorKey)}`}
            key={plain.id ?? String(plain.accessorKey ?? index)}
          >
            {plain.cell?.(context)}
          </div>
        );
      })}
    </div>
  );
}

describe('buildPlansTableColumns', () => {
  test('defines status, details, and actions columns', () => {
    const columns = buildPlansTableColumns({});

    expect(columns).toHaveLength(3);
    expect(asPlainColumn(columns[0]).accessorKey).toBe('status');
    expect(asPlainColumn(columns[1]).accessorKey).toBe('details');
    expect(asPlainColumn(columns[2]).id).toBe('actions');
  });

  test('renders header labels for each column', () => {
    const columns = buildPlansTableColumns({});
    const headers = columns.map((column) => {
      const header = asPlainColumn(column).header;
      return typeof header === 'function' ? header(headerContext()) : header;
    });

    const rendered = renderRoutesStub(
      <div>
        {headers.map((header, index) => (
          <div key={index}>{header}</div>
        ))}
      </div>,
    );

    expect(rendered.getByText('Status')).toBeInTheDocument();
    expect(rendered.getByText('Plan Details')).toBeInTheDocument();
    expect(rendered.getByText('Actions')).toBeInTheDocument();
  });

  test('status cell links to the status-filtered plans list with the label', () => {
    const plan = buildPlan({ status: 'IN_PROGRESS' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    const link = rendered.getByText('In Progress').closest('a');
    expect(link).toHaveAttribute('href', '/plans?status=IN_PROGRESS');
  });

  test('status cell falls back to PENDING styling for an unknown status', () => {
    const plan = buildPlan({ status: 'NOT_A_REAL_STATUS' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(rendered.getByText('Pending')).toBeInTheDocument();
  });

  test('title cell renders title, task count, tags, project, and author/assignee', () => {
    const plan = buildPlan({
      assignee: 'bob',
      author: 'alice',
      hasCustomRunConfig: true,
      projectRelation: {
        __typename: 'ProjectObject',
        id: 'proj-1',
        name: 'Proj One',
      },
      tags: [{ __typename: 'PlanTagObject', dimension: 'phase', tag: 'alpha' }],
      taskCount: 5,
      tasksCompletedCount: 2,
      title: 'Ship the thing',
    });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(
      rendered.getByRole('link', { name: 'View plan: Ship the thing' }),
    ).toHaveAttribute('href', '/plans/plan-1');
    expect(
      rendered.getByLabelText('2 of 5 tasks resolved'),
    ).toBeInTheDocument();
    expect(rendered.getByLabelText('Tag: alpha')).toBeInTheDocument();
    expect(rendered.getByLabelText('Project: Proj One')).toHaveAttribute(
      'href',
      '/projects/proj-1',
    );
    expect(rendered.getByLabelText('Author: alice')).toHaveTextContent(
      'alice → bob',
    );
  });

  test('title cell renders a plain project string when no projectRelation is set', () => {
    const plan = buildPlan({
      project: 'legacy-project',
      taskCount: 1,
      tasksCompletedCount: 0,
    });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(
      rendered.getByLabelText('Project: legacy-project'),
    ).toBeInTheDocument();
    expect(
      rendered.getByLabelText('0 of 1 tasks resolved'),
    ).toBeInTheDocument();
  });

  test('title cell shows assignee-only label when there is no author', () => {
    const plan = buildPlan({ assignee: 'carol', author: '' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(rendered.getByLabelText('Assignee: carol')).toHaveTextContent(
      'Assignee: carol',
    );
  });

  test('actions cell opens a menu with View plan and the open-in links, without Queue', async () => {
    const plan = buildPlan({ status: 'PENDING', title: 'Queueable Plan' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);
    const user = userEvent.setup();

    await user.click(
      rendered.getByRole('button', {
        name: `${PLANS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} Queueable Plan`,
      }),
    );

    expect(
      rendered.getByRole('menuitem', { name: PLANS_ROW_ACTIONS_COPY.view }),
    ).toBeInTheDocument();
    for (const label of ['Claude', 'Cursor', 'VSCode', 'BullMQ']) {
      expect(
        rendered.getByRole('menuitem', { name: label }),
      ).toBeInTheDocument();
    }
    // The Queue action is parked while runs are launched from plan details.
    expect(
      rendered.queryByRole('menuitem', { name: PLANS_ROW_ACTIONS_COPY.queue }),
    ).toBeNull();
  });

  test('actions menu shows Kill only when the plan is cancelable', async () => {
    const running = buildPlan({ status: 'IN_PROGRESS', title: 'Running Plan' });
    const runningRendered = renderRoutesStub(<Harness plan={running} />);
    const runningUser = userEvent.setup();

    await runningUser.click(
      runningRendered.getByRole('button', {
        name: `${PLANS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} Running Plan`,
      }),
    );
    expect(
      runningRendered.getByRole('menuitem', {
        name: PLANS_ROW_ACTIONS_COPY.killConfirm,
      }),
    ).toBeInTheDocument();
    runningRendered.unmount();

    const pending = buildPlan({ status: 'PENDING', title: 'Idle Plan' });
    const pendingRendered = renderRoutesStub(<Harness plan={pending} />);
    const pendingUser = userEvent.setup();
    await pendingUser.click(
      pendingRendered.getByRole('button', {
        name: `${PLANS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} Idle Plan`,
      }),
    );
    expect(
      pendingRendered.queryByRole('menuitem', {
        name: PLANS_ROW_ACTIONS_COPY.killConfirm,
      }),
    ).toBeNull();
  });
});
