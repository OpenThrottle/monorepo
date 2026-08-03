import * as React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ScheduleRunDetail from '../schedule.$jobId.runs.$runId';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRouteHarness } from '~/testing/route-fixtures';
import type { ScheduledJobRunDetailFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/schedule.$jobId.runs.$runId';

const job = { id: 'job-1', name: 'Nightly audit' };

const run = (
  overrides: Partial<ScheduledJobRunDetailFragment> = {},
): ScheduledJobRunDetailFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'run-1',
  cacheReadTokens: 20,
  cacheWriteTokens: 10,
  cancelRequestedAt: null,
  costUsd: 0.0123,
  createdAt: '2026-07-31T09:00:00.000Z',
  driverId: 'claude',
  errorMessage: null,
  exitCode: 0,
  finishedAt: '2026-07-31T09:01:23.000Z',
  id: 'run-1',
  inputTokens: 100,
  model: 'opus',
  outputTokens: 50,
  reasoningTokens: null,
  scheduledAgentJobId: 'job-1',
  settingsSnapshotJson: JSON.stringify({ driverId: 'claude', model: 'opus' }),
  startedAt: '2026-07-31T09:00:00.000Z',
  status: 'succeeded',
  totalTokens: 150,
  trigger: 'manual',
  ...overrides,
});

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule.$jobId.runs.$runId',
    loaderData: {
      job,
      queueName: 'Scheduled Agent Jobs',
      run: run(),
    },
    params: { jobId: 'job-1', runId: 'run-1' },
    pathname: '/schedule/job-1/runs/run-1',
  },
];

// The embedded QueueJobLogConsole backfills history via a fetcher to
// /resources/queue-job-logs on mount; stub that route so the fetch resolves
// (empty page) instead of throwing "No route matches URL" in the test router.
const renderRun = (
  value: ScheduledJobRunDetailFragment,
  options: { action?: () => unknown } = {},
) =>
  renderRouteHarness([
    {
      Component: (): React.ReactElement => (
        <ScheduleRunDetail
          actionData={undefined}
          loaderData={{ job, queueName: 'Scheduled Agent Jobs', run: value }}
          matches={matches}
          params={{ jobId: 'job-1', runId: 'run-1' }}
        />
      ),
      action: options.action,
      path: '/',
    },
    {
      loader: () => ({ events: [], hasMore: false, nextCursor: null }),
      path: '/resources/queue-job-logs',
    },
  ]);

describe('routes/schedule.$jobId.runs.$runId.tsx', () => {
  test('renders a succeeded run with metadata, duration, and back link', () => {
    const component = renderRun(run());

    expect(component.getByTestId('RunDetail')).toBeInTheDocument();
    expect(component.getByText('succeeded')).toBeInTheDocument();
    expect(component.getByText('Nightly audit')).toBeInTheDocument();
    // duration 09:00:00 -> 09:01:23 = 1m 23s
    expect(component.getByText('1m 23s')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /back to job/i }),
    ).toHaveAttribute('href', '/schedule/job-1');
  });

  test('renders the token-usage breakdown, cost, and settings snapshot', () => {
    const component = renderRun(run());

    expect(component.getByText('Token usage')).toBeInTheDocument();
    // per-kind counts + total + formatted cost
    expect(component.getByText('100')).toBeInTheDocument();
    expect(component.getByText('150')).toBeInTheDocument();
    expect(component.getByText('$0.012')).toBeInTheDocument();
    // settings snapshot pretty-printed
    expect(component.getByText('Settings snapshot')).toBeInTheDocument();
    expect(component.getByText(/"driverId": "claude"/)).toBeInTheDocument();
  });

  test('shows empty-usage + empty-snapshot copy when nothing was captured', () => {
    const component = renderRun(
      run({
        cacheReadTokens: null,
        cacheWriteTokens: null,
        costUsd: null,
        inputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        settingsSnapshotJson: null,
        totalTokens: null,
      }),
    );

    expect(
      component.getByText(/no token usage was reported/i),
    ).toBeInTheDocument();
    expect(
      component.getByText(/no settings snapshot was captured/i),
    ).toBeInTheDocument();
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

  test('offers Cancel run for a running, not-yet-cancelled run', () => {
    const component = renderRun(run({ finishedAt: null, status: 'running' }));

    expect(
      component.getByRole('button', { name: /cancel run/i }),
    ).toBeInTheDocument();
  });

  test('hides Cancel run for a terminal run', () => {
    const component = renderRun(run({ status: 'succeeded' }));

    expect(component.queryByRole('button', { name: /cancel run/i })).toBeNull();
  });

  test('shows Cancel requested instead of the button once cancel is requested', () => {
    const component = renderRun(
      run({
        cancelRequestedAt: '2026-07-31T09:00:30.000Z',
        finishedAt: null,
        status: 'running',
      }),
    );

    expect(component.queryByRole('button', { name: /cancel run/i })).toBeNull();
    expect(
      component.getByRole('button', { name: /cancel requested/i }),
    ).toBeInTheDocument();
  });

  test('submitting Cancel run calls the route action', async () => {
    const action = vi.fn(() => ({ ok: true }));
    const component = renderRun(run({ finishedAt: null, status: 'running' }), {
      action,
    });

    const user = userEvent.setup();
    await user.click(component.getByRole('button', { name: /cancel run/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
  });
});
