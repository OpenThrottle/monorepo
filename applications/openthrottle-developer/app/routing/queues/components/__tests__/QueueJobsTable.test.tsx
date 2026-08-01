import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueJobsTable } from '../QueueJobsTable';
import type { QueueJobsTableProps } from '../QueueJobsTable';

type QueueJobsTableJob = QueueJobsTableProps['jobs'][number];

const planId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const taskId = '11111111-2222-3333-4444-555555555555';

const jobWithPlan: QueueJobsTableJob = {
  data: JSON.stringify({
    mode: 'task',
    planId,
    runKind: 'orchestrator',
    taskId,
  }),
  failedReason: null,
  finishedOn: 1_700_000_100_000,
  id: 'job-with-plan',
  name: 'ralph-run',
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'completed',
  timestamp: 1_700_000_000_000,
};

const failedJob: QueueJobsTableJob = {
  data: null,
  failedReason: 'Connection timeout after 30s',
  finishedOn: 1_700_000_200_000,
  id: 'job-failed-1',
  name: null,
  processedOn: null,
  progress: null,
  returnvalue: null,
  state: 'failed',
  timestamp: 1_700_000_150_000,
};

function renderTable(props: QueueJobsTableProps): RenderResult {
  const Component = () => <QueueJobsTable {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('QueueJobsTable Component', () => {
  let component: RenderResult;
  let props: QueueJobsTableProps;

  beforeEach(() => {
    props = { jobs: [], queueName: 'plans' };
    component = renderTable(props);
  });

  test('renders table region when jobs array is empty', () => {
    expect(component.getByTestId('QueueJobsTable')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /State/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Job/i }),
    ).toBeInTheDocument();
  });

  test('renders column headers when jobs are provided', () => {
    props = { jobs: [jobWithPlan, failedJob], queueName: 'plans' };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueueJobsTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByRole('columnheader', { name: /State/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Job/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Plan \/ task/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Run/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Created/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Finished/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Failed/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Actions/i }),
    ).toBeInTheDocument();
  });

  test('renders state badge, plan link, and detail link for job with parsed payload', () => {
    props = { jobs: [jobWithPlan], queueName: 'plans' };
    component = renderTable(props);

    expect(component.getByTestId('job-state-job-with-plan')).toHaveTextContent(
      'Completed',
    );
    expect(
      component.getByTestId('queue-jobs-table-plan-job-with-plan'),
    ).toHaveAttribute('href', `/plans/${planId}`);
    expect(
      component.getByTestId('queue-jobs-table-task-job-with-plan'),
    ).toHaveAttribute('href', `/plans/${planId}/tasks/${taskId}`);
    expect(component.getByTestId('job-id-link-job-with-plan')).toHaveAttribute(
      'href',
      '/queues/plans/job-with-plan',
    );
    expect(
      component.getByRole('link', {
        name: 'View job details for job-with-plan',
      }),
    ).toHaveAttribute('href', '/queues/plans/job-with-plan');
  });

  test('renders failed reason and destructive state for failed jobs', () => {
    props = { jobs: [failedJob], queueName: 'plans' };
    component = renderTable(props);

    expect(component.getByTestId('job-state-job-failed-1')).toHaveTextContent(
      'Failed',
    );
    expect(
      component.getByTestId('job-failedReason-job-failed-1'),
    ).toHaveTextContent('Connection timeout after 30s');
    expect(
      component.getByRole('link', {
        name: 'View job details for job-failed-1',
      }),
    ).toHaveAttribute('href', '/queues/plans/job-failed-1');
  });

  test('shows em dash for plan/task when payload has no planId', () => {
    props = { jobs: [failedJob], queueName: 'plans' };
    component = renderTable(props);

    expect(
      component.queryByTestId('queue-jobs-table-plan-job-failed-1'),
    ).not.toBeInTheDocument();
  });
});
