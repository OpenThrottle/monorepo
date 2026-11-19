import type {
  DataTableCellContext,
  DataTableHeaderContext,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { PlanCardFragment } from '~/__generated__/graphql';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { buildPlansTableColumns } from '../buildPlansTableColumns';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const cellContext = (
  plan: PlanCardFragment,
): DataTableCellContext<
  PlanCardFragment,
  string | number | null | undefined
> => {
  return asMock({ row: { original: plan } });
};

const headerContext = (): DataTableHeaderContext<
  PlanCardFragment,
  string | number | null | undefined
> => {
  return asMock({});
};

interface PlainPlanColumn {
  readonly accessorKey?: string;
  readonly cell?: (
    ctx: DataTableCellContext<
      PlanCardFragment,
      string | number | null | undefined
    >,
  ) => React.ReactNode;
  readonly header?:
    | string
    | ((
        ctx: DataTableHeaderContext<
          PlanCardFragment,
          string | number | null | undefined
        >,
      ) => React.ReactNode);
  readonly id?: string;
}

const asPlainColumn = (
  column: ReturnType<typeof buildPlansTableColumns>[number],
): PlainPlanColumn => {
  return asMock(column);
};

const buildPlan = (
  overrides: Partial<PlanCardFragment> = {},
): PlanCardFragment => {
  return {
    assignee: null,
    author: 'visormatt',
    category: 'general',
    createdAt: '2026-01-01T00:00:00Z',
    description: null,
    hasCustomRunConfig: false,
    id: 'plan-1',
    project: null,
    projectRelation: null,
    scheduledRunAt: null,
    status: 'PENDING',
    summary: null,
    tags: [],
    taskCount: 3,
    tasksCompletedCount: 0,
    title: 'My Plan',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
};

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
  test('defines status and details columns', () => {
    const columns = buildPlansTableColumns({});

    const [statusColumn, detailsColumn] = columns;

    expect(columns).toHaveLength(2);
    if (statusColumn === undefined || detailsColumn === undefined) {
      throw new Error('expected two plan table columns');
    }

    expect(asPlainColumn(statusColumn).accessorKey).toBe('status');
    expect(asPlainColumn(detailsColumn).accessorKey).toBe('details');
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

  test('details cell links the title and task count to the plan', () => {
    const plan = buildPlan({
      taskCount: 5,
      tasksCompletedCount: 2,
      title: 'Ship the thing',
    });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    const link = rendered.getByRole('link', {
      name: 'View plan: Ship the thing',
    });
    expect(link).toHaveAttribute('href', '/plans/plan-1');
    expect(link).toContainElement(
      rendered.getByLabelText('2 of 5 tasks resolved'),
    );
  });

  test('details cell plan link grows to fill the cell so empty space is clickable', () => {
    const plan = buildPlan({ hasCustomRunConfig: true, title: 'Wide' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    const link = rendered.getByTestId('plan-list-title-link');
    expect(link).toHaveClass('flex-1', 'min-w-0', 'p-2', 'max-sm:contents');
    expect(link.parentElement).not.toHaveClass('p-2');

    const indicator = rendered.getByRole('link', {
      name: 'Custom workflow run configuration (differs from defaults)',
    });
    expect(indicator).toHaveClass('shrink-0');
    expect(indicator).toHaveAttribute(
      'href',
      '/plans/plan-1?tab=configuration',
    );
  });

  test('details cell renders the run-config indicator outside the plan link', () => {
    const plan = buildPlan({ hasCustomRunConfig: true, title: 'Tuned' });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    const indicator = rendered.getByRole('link', {
      name: 'Custom workflow run configuration (differs from defaults)',
    });
    expect(indicator).toHaveAttribute(
      'href',
      '/plans/plan-1?tab=configuration',
    );
    expect(
      rendered.getByRole('link', { name: 'View plan: Tuned' }),
    ).not.toContainElement(indicator);
  });

  test('details cell omits the run-config indicator for default configs', () => {
    const plan = buildPlan({ hasCustomRunConfig: false });
    const rendered = renderRoutesStub(<Harness plan={plan} />);

    expect(
      rendered.queryByRole('link', {
        name: 'Custom workflow run configuration (differs from defaults)',
      }),
    ).toBeNull();
  });
});
