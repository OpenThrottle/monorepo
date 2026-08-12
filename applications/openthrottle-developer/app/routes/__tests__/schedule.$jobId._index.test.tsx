import * as React from 'react';
import { describe, expect, test } from 'vitest';
import Component from '../schedule.$jobId._index';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/schedule.$jobId._index';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const job: Route.ComponentProps['loaderData']['job'] = {
  createdAt: '2026-07-24T00:00:00.000Z',
  cronPattern: '0 * * * *',
  cwd: null,
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: 'sonnet',
  name: 'Nightly rebuild',
  nextRunAt: null,
  prompt: 'Rebuild the cache',
  settingsJson: '{}',
  timeoutMs: null,
  timezone: null,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

const run: Route.ComponentProps['loaderData']['runs'][number] = {
  bullmqJobId: null,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
  createdAt: '2026-07-24T00:00:00.000Z',
  driverId: 'claude',
  errorMessage: null,
  exitCode: 0,
  finishedAt: '2026-07-24T00:05:00.000Z',
  id: 'run-1',
  inputTokens: null,
  model: 'sonnet',
  outputTokens: null,
  reasoningTokens: null,
  startedAt: '2026-07-24T00:00:00.000Z',
  status: 'succeeded',
  totalTokens: null,
  trigger: 'schedule',
};

describe('routes/schedule.$jobId._index.tsx', () => {
  test('renders job details and an empty run history state', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [] }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(view.getByTestId('ScheduleDetail')).toBeInTheDocument();
    expect(view.getByText(job.name)).toBeInTheDocument();
    expect(view.getByText(job.prompt)).toBeInTheDocument();
    expect(
      view.getByText('No runs yet. Use “Run now” to trigger one.'),
    ).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
  });

  test('renders the runs table when runs exist', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [run] }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(
      view.queryByText('No runs yet. Use “Run now” to trigger one.'),
    ).not.toBeInTheDocument();
  });

  test('shows the disabled job toggle label and the action error banner', () => {
    const view = renderRoutesStub(
      <Component
        actionData={{ error: 'Action failed.' }}
        loaderData={{ job: { ...job, enabled: false }, runs: [] }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(view.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    expect(view.getByRole('alert')).toHaveTextContent('Action failed.');
  });
});
