import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/schedule.$jobId._index';
import {
  SCHEDULE_APPROVAL_COPY,
  SCHEDULE_WEBHOOK_COPY,
} from '~/routing/schedule/data/copy';
import { renderRoutesStub } from '~/testing/route-fixtures';
import { scheduleWebhookTriggerFixture } from '~/testing/schedule-fixtures';

import Component from '../schedule.$jobId._index';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

const job: Route.ComponentProps['loaderData']['job'] = {
  allowedCommands: [],
  approvalState: 'not_required',
  createdAt: '2026-07-24T00:00:00.000Z',
  createdVia: 'ui',
  cronPattern: '0 * * * *',
  cwd: null,
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  misfirePolicy: 'skip',
  misfireThresholdMs: 600_000,
  model: 'sonnet',
  name: 'Nightly rebuild',
  nextRunAt: null,
  prompt: 'Rebuild the cache',
  scheduleKind: 'cron',
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
  resumeOfRunId: null,
  startedAt: '2026-07-24T00:00:00.000Z',
  status: 'succeeded',
  totalTokens: null,
  trigger: 'schedule',
  usageLimitResetsAt: null,
};

describe('routes/schedule.$jobId._index.tsx', () => {
  test('opens on the Prompt tab with the job details above it', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [], webhookTrigger: null }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(view.getByTestId('ScheduleDetail')).toBeInTheDocument();
    expect(view.getByText(job.name)).toBeInTheDocument();
    expect(view.getByText(job.prompt)).toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    // Run history lives behind the History tab now, so it is not mounted yet.
    expect(
      view.queryByText('No runs yet. Use “Run now” to trigger one.'),
    ).not.toBeInTheDocument();
  });

  test('shows the empty run history state on the History tab', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [], webhookTrigger: null }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    await user.click(view.getByRole('tab', { name: /history/i }));

    expect(
      view.getByText('No runs yet. Use “Run now” to trigger one.'),
    ).toBeInTheDocument();
  });

  test('renders the runs table on the History tab when runs exist', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [run], webhookTrigger: null }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    await user.click(view.getByRole('tab', { name: /history/i }));

    expect(view.getByTestId('ScheduleRunsTable')).toBeInTheDocument();
    expect(
      view.queryByText('No runs yet. Use “Run now” to trigger one.'),
    ).not.toBeInTheDocument();
  });

  test('shows the disabled job toggle label and the action error banner', () => {
    const view = renderRoutesStub(
      <Component
        actionData={{ error: 'Action failed.' }}
        loaderData={{
          job: { ...job, enabled: false },
          runs: [],
          webhookTrigger: null,
        }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(view.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    expect(view.getByRole('alert')).toHaveTextContent('Action failed.');
  });

  test('shows the Awaiting approval state with Approve, and no Enable, for a pending job', () => {
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{
          job: {
            ...job,
            approvalState: 'pending',
            createdVia: 'mcp',
            enabled: false,
          },
          runs: [],
          webhookTrigger: null,
        }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    expect(view.getByRole('status')).toHaveTextContent(
      SCHEDULE_APPROVAL_COPY.awaitingDescription,
    );
    expect(
      view.getByRole('button', { name: SCHEDULE_APPROVAL_COPY.approveAction }),
    ).toBeInTheDocument();
    expect(
      view.queryByRole('button', { name: 'Enable' }),
    ).not.toBeInTheDocument();
    expect(
      view.getByText(SCHEDULE_APPROVAL_COPY.agentCreatedBadge),
    ).toBeInTheDocument();
  });

  test('puts trigger setup on the Webhook tab', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <Component
        actionData={undefined}
        loaderData={{ job, runs: [], webhookTrigger: null }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    await user.click(
      view.getByRole('tab', { name: SCHEDULE_WEBHOOK_COPY.tabLabel }),
    );

    expect(
      view.getByRole('button', { name: SCHEDULE_WEBHOOK_COPY.createAction }),
    ).toBeInTheDocument();
  });

  test('reveals the one-time credentials returned by a create, on the Webhook tab', async () => {
    const user = userEvent.setup();
    const view = renderRoutesStub(
      <Component
        actionData={{
          ok: true,
          webhookCredentials: {
            secret: 'abc',
            webhookPath: '/webhooks/agent-jobs/t',
          },
        }}
        loaderData={{
          job,
          runs: [],
          webhookTrigger: scheduleWebhookTriggerFixture(),
        }}
        matches={stubMatches()}
        params={{ jobId: job.id }}
      />,
    );

    await user.click(
      view.getByRole('tab', { name: SCHEDULE_WEBHOOK_COPY.tabLabel }),
    );

    expect(
      view.getByLabelText(SCHEDULE_WEBHOOK_COPY.revealSecretLabel),
    ).toHaveValue('abc');
  });
});
