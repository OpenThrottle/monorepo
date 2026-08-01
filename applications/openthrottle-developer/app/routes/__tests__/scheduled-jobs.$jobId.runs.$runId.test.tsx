import * as React from 'react';
import { describe, expect, test } from 'vitest';
import ScheduledJobRunDetail from '../scheduled-jobs.$jobId.runs.$runId';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRouteHarness } from '~/testing/route-fixtures';
import type { ScheduledJobRunDetailFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/scheduled-jobs.$jobId.runs.$runId';

const job = { id: 'job-1', name: 'Nightly audit' };

const run = (
  overrides: Partial<ScheduledJobRunDetailFragment> = {},
): ScheduledJobRunDetailFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'run-1',
  cancelRequestedAt: null,
  createdAt: '2026-07-31T09:00:00.000Z',
  driverId: 'claude',
  errorMessage: null,
  exitCode: 0,
  finishedAt: '2026-07-31T09:01:23.000Z',
  id: 'run-1',
  model: 'opus',
  scheduledAgentJobId: 'job-1',
  startedAt: '2026-07-31T09:00:00.000Z',
  status: 'succeeded',
  trigger: 'manual',
  ...overrides,
});

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/scheduled-jobs.$jobId.runs.$runId',
    loaderData: {
      job,
      queueName: 'Scheduled Agent Jobs',
      run: run(),
    },
    params: { jobId: 'job-1', runId: 'run-1' },
    pathname: '/scheduled-jobs/job-1/runs/run-1',
  },
];

// The embedded QueueJobLogConsole backfills history via a fetcher to
// /resources/queue-job-logs on mount; stub that route so the fetch resolves
// (empty page) instead of throwing "No route matches URL" in the test router.
const renderRun = (value: ScheduledJobRunDetailFragment) =>
  renderRouteHarness([
    {
      Component: (): React.ReactElement => (
        <ScheduledJobRunDetail
          actionData={undefined}
          loaderData={{ job, queueName: 'Scheduled Agent Jobs', run: value }}
          matches={matches}
          params={{ jobId: 'job-1', runId: 'run-1' }}
        />
      ),
      path: '/',
    },
    {
      loader: () => ({ events: [], hasMore: false, nextCursor: null }),
      path: '/resources/queue-job-logs',
    },
  ]);

describe('routes/scheduled-jobs.$jobId.runs.$runId.tsx', () => {
  test('renders a succeeded run with metadata, duration, and back link', () => {
    const component = renderRun(run());

    expect(component.getByTestId('RunDetail')).toBeInTheDocument();
    expect(component.getByText('succeeded')).toBeInTheDocument();
    expect(component.getByText('Nightly audit')).toBeInTheDocument();
    // duration 09:00:00 -> 09:01:23 = 1m 23s
    expect(component.getByText('1m 23s')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to job/i }),
    ).toHaveAttribute('href', '/scheduled-jobs/job-1');
  });

  test('renders the full error message for a failed run', () => {
    const component = renderRun(
      run({
        errorMessage: 'boom: process exited non-zero',
        exitCode: 1,
        status: 'failed',
      }),
    );

    expect(component.getByText('failed')).toBeInTheDocument();
    expect(
      component.getByText('boom: process exited non-zero'),
    ).toBeInTheDocument();
  });

  test('renders a running run with an em-dash duration and no error', () => {
    const component = renderRun(
      run({
        errorMessage: null,
        exitCode: null,
        finishedAt: null,
        status: 'running',
      }),
    );

    expect(component.getByText('running')).toBeInTheDocument();
    // no finishedAt -> duration em dash present
    expect(component.getAllByText('—').length).toBeGreaterThan(0);
  });

  test('shows the cancel-requested note when cancelRequestedAt is set', () => {
    const component = renderRun(
      run({ cancelRequestedAt: '2026-07-31T09:00:30.000Z', status: 'running' }),
    );

    expect(component.getByText(/cancellation requested/i)).toBeInTheDocument();
  });

  test('mounts the log console for an enqueued run', () => {
    const component = renderRun(run({ bullmqJobId: 'run-1' }));

    expect(component.getByTestId('QueueJobLogConsole')).toBeInTheDocument();
  });

  test('shows a pending-logs placeholder when the run is not yet enqueued', () => {
    const component = renderRun(
      run({ bullmqJobId: null, finishedAt: null, status: 'queued' }),
    );

    expect(component.queryByTestId('QueueJobLogConsole')).toBeNull();
    expect(
      component.getByText(/logs available once the run is enqueued/i),
    ).toBeInTheDocument();
  });
});
