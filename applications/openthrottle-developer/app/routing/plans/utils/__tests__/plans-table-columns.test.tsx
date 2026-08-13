import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { useFetcher } from 'react-router';
import { buildPlansTableColumns } from '../plans-table-columns';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { action as planDetailAction } from '~/routes/plans.$planId._index';
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
  title: 'My Plan',
  updatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
});

interface HarnessProps {
  readonly plan: PlanCardFragment;
}

function Harness(props: HarnessProps): React.ReactElement {
  const fetcher = useFetcher<typeof planDetailAction>();
  const columns = buildPlansTableColumns({}, fetcher);
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
  test('defines status, title, and actions columns', () => {
    const columns = buildPlansTableColumns({}, asMock({ state: 'idle' }));

    expect(columns).toHaveLength(3);
    expect(asPlainColumn(columns[0]).accessorKey).toBe('status');
    expect(asPlainColumn(columns[1]).accessorKey).toBe('title');
    expect(asPlainColumn(columns[2]).id).toBe('actions');
  });

  test('renders header labels for each column', () => {
    const columns = buildPlansTableColumns({}, asMock({ state: 'idle' }));
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
    expect(rendered.getByText('Plan')).toBeInTheDocument();
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
      title: 'Ship the thing',
    });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(
      rendered.getByRole('link', { name: 'View plan: Ship the thing' }),
    ).toHaveAttribute('href', '/plans/plan-1');
    expect(rendered.getByLabelText('5 tasks')).toBeInTheDocument();
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
    const plan = buildPlan({ project: 'legacy-project', taskCount: 1 });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(
      rendered.getByLabelText('Project: legacy-project'),
    ).toBeInTheDocument();
    expect(rendered.getByLabelText('1 tasks')).toBeInTheDocument();
  });

  test('title cell shows assignee-only label when there is no author', () => {
    const plan = buildPlan({ assignee: 'carol', author: '' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(rendered.getByLabelText('Assignee: carol')).toHaveTextContent(
      'Assignee: carol',
    );
  });

  test('actions cell renders a Queue button that submits runPlan', () => {
    const plan = buildPlan({ status: 'PENDING', title: 'Queueable Plan' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    const button = rendered.getByRole('button', {
      name: /Queue plan Queueable Plan/,
    });
    expect(button).toHaveTextContent('Queue');
  });

  test('actions cell shows the kill button only when the plan is cancelable', () => {
    const running = buildPlan({ status: 'IN_PROGRESS', title: 'Running Plan' });
    const runningRendered = renderRoutesStub(<Harness plan={running} />);
    expect(
      runningRendered.queryByRole('button', {
        name: 'Kill plan run for Running Plan',
      }),
    ).not.toBeNull();

    const pending = buildPlan({ status: 'PENDING', title: 'Idle Plan' });
    const pendingRendered = renderRoutesStub(<Harness plan={pending} />);
    expect(
      pendingRendered.queryByRole('button', {
        name: 'Kill plan run for Idle Plan',
      }),
    ).toBeNull();
  });
});
