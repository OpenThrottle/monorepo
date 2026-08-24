import * as React from 'react';
import { describe, expect, test } from 'vitest';
import {
  buildQueueJobsTableColumns,
  queueJobRowId,
} from '../queue-jobs-table-columns';
import type { QueueJobsTableJob } from '../queue-jobs-table-columns';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { CellContext, HeaderContext } from '@tanstack/react-table';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

const cellContext = (
  job: QueueJobsTableJob,
): CellContext<QueueJobsTableJob, string | number | null | undefined> =>
  asMock({ row: { original: job } });

const headerContext = (): HeaderContext<
  QueueJobsTableJob,
  string | number | null | undefined
> => asMock({});

interface PlainJobColumn {
  readonly cell?: (
    ctx: CellContext<QueueJobsTableJob, string | number | null | undefined>,
  ) => React.ReactNode;
  readonly header?:
    | string
    | ((
        ctx: HeaderContext<
          QueueJobsTableJob,
          string | number | null | undefined
        >,
      ) => React.ReactNode);
  readonly id?: string;
}

const asPlainColumn = (
  column: ReturnType<typeof buildQueueJobsTableColumns>[number],
): PlainJobColumn => asMock(column);

const buildJob = (
  overrides: Partial<QueueJobsTableJob> = {},
): QueueJobsTableJob => ({
  __typename: 'JobObject',
  data: null,
  failedReason: null,
  finishedOn: null,
  id: 'job-1',
  name: null,
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'completed',
  timestamp: null,
  ...overrides,
});

interface HarnessProps {
  readonly job: QueueJobsTableJob;
  readonly queueName: string;
}

function Harness(props: HarnessProps): React.ReactElement {
  const columns = buildQueueJobsTableColumns(props.queueName);
  const context = cellContext(props.job);

  return (
    <div>
      {columns.map((column) => {
        const plain = asPlainColumn(column);
        return (
          <div data-testid={`cell-${plain.id ?? ''}`} key={plain.id}>
            {plain.cell?.(context)}
          </div>
        );
      })}
    </div>
  );
}

describe('queueJobRowId', () => {
  test('returns the job id', () => {
    expect(queueJobRowId(buildJob({ id: 'job-42' }))).toBe('job-42');
  });
});

describe('buildQueueJobsTableColumns', () => {
  test('defines the state, job, planTask, run, created, finished, and failedReason columns', () => {
    const columns = buildQueueJobsTableColumns('my-queue');

    expect(columns.map((column) => column.id)).toEqual([
      'state',
      'job',
      'planTask',
      'run',
      'created',
      'finished',
      'failedReason',
    ]);
  });

  test('renders header labels for every column', () => {
    const columns = buildQueueJobsTableColumns('my-queue');
    const headers = columns.map((column) =>
      typeof column.header === 'function'
        ? column.header(headerContext())
        : column.header,
    );

    const rendered = renderRoutesStub(
      <div>
        {headers.map((header, index) => (
          <div key={index}>{header}</div>
        ))}
      </div>,
    );

    expect(rendered.getByText('State')).toBeInTheDocument();
    expect(rendered.getByText('Job')).toBeInTheDocument();
    expect(rendered.getByText('Job id and name')).toBeInTheDocument();
    expect(rendered.getByText('Plan / task')).toBeInTheDocument();
    expect(rendered.getByText('Run')).toBeInTheDocument();
    expect(rendered.getByText('kind · mode')).toBeInTheDocument();
    expect(rendered.getByText('Created')).toBeInTheDocument();
    expect(rendered.getByText('Finished')).toBeInTheDocument();
    expect(rendered.getByText('Failed')).toBeInTheDocument();
    expect(rendered.getByText('reason')).toBeInTheDocument();
  });

  test('state cell renders the QueueStateBadge for the job state', () => {
    const job = buildJob({ id: 'job-1', state: 'active' });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    expect(rendered.getByTestId('job-state-job-1')).toBeInTheDocument();
  });

  test('job cell links to the job detail page and truncates a long id', () => {
    const longId = 'a'.repeat(40);
    const job = buildJob({ id: longId, name: 'process-thing' });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    const link = rendered.getByTestId(`job-id-link-${longId}`);
    expect(link).toHaveAttribute(
      'href',
      `/queues/my-queue/${encodeURIComponent(longId)}`,
    );
    expect(link.textContent).toHaveLength(25);
    expect(rendered.getByText('process-thing')).toBeInTheDocument();
  });

  test('job cell omits the name paragraph when name is empty', () => {
    const job = buildJob({ id: 'job-2', name: '' });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    expect(rendered.queryByText('process-thing')).toBeNull();
  });

  test('planTask cell renders an em dash when the job data has no planId', () => {
    const job = buildJob({ data: null, id: 'job-3' });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    expect(rendered.getByTestId('cell-planTask')).toHaveTextContent('—');
  });

  test('planTask cell renders plan and task links when present in job data', () => {
    const job = buildJob({
      data: JSON.stringify({ planId: 'plan-1', taskId: 'task-1' }),
      id: 'job-4',
    });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    expect(rendered.getByTestId('queue-jobs-table-plan-job-4')).toHaveAttribute(
      'href',
      '/plans/plan-1',
    );
    expect(rendered.getByTestId('queue-jobs-table-task-job-4')).toHaveAttribute(
      'href',
      '/plans/plan-1/tasks/task-1',
    );
  });

  test('run cell renders the runKind/mode label or an em dash', () => {
    const withRun = buildJob({
      data: JSON.stringify({ mode: 'auto', runKind: 'ralph' }),
      id: 'job-5',
    });
    const rendered = renderRoutesStub(
      <Harness job={withRun} queueName="my-queue" />,
    );
    expect(rendered.getByText('ralph · auto')).toBeInTheDocument();

    const withoutRun = buildJob({ data: null, id: 'job-6' });
    const renderedEmpty = renderRoutesStub(
      <Harness job={withoutRun} queueName="my-queue" />,
    );
    expect(renderedEmpty.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('created and finished cells format unix timestamps as ISO strings, or an em dash', () => {
    const job = buildJob({
      finishedOn: 1700000000123,
      id: 'job-7',
      timestamp: 1600000000123,
    });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    expect(
      rendered.getByText(new Date(1600000000123).toISOString()),
    ).toBeInTheDocument();
    expect(
      rendered.getByText(new Date(1700000000123).toISOString()),
    ).toBeInTheDocument();

    const empty = buildJob({ finishedOn: null, id: 'job-8', timestamp: null });
    const renderedEmpty = renderRoutesStub(
      <Harness job={empty} queueName="my-queue" />,
    );
    expect(renderedEmpty.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('failedReason cell truncates a long reason and shows an em dash when absent', () => {
    const longReason = 'x'.repeat(100);
    const job = buildJob({ failedReason: longReason, id: 'job-9' });
    const rendered = renderRoutesStub(
      <Harness job={job} queueName="my-queue" />,
    );

    const reasonEl = rendered.getByTestId('job-failedReason-job-9');
    expect(reasonEl.textContent).toHaveLength(73);
    expect(reasonEl).toHaveAttribute('title', longReason);

    const withoutReason = buildJob({ failedReason: null, id: 'job-10' });
    const renderedEmpty = renderRoutesStub(
      <Harness job={withoutReason} queueName="my-queue" />,
    );
    expect(renderedEmpty.getAllByText('—').length).toBeGreaterThan(0);
  });
});
