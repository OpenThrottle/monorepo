import * as React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import EditSchedule from '../schedule.$jobId.edit';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRouteHarness, renderRoutesStub } from '~/testing/route-fixtures';
import type { ScheduledAgentJobDetailQuery } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/schedule.$jobId.edit';

type ScheduleJob = NonNullable<
  ScheduledAgentJobDetailQuery['scheduledAgentJob']
>;

const job: ScheduleJob = {
  __typename: 'ScheduledAgentJobObject',
  createdAt: '2026-07-31T00:00:00.000Z',
  cronPattern: '0 9 * * *',
  cwd: null,
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: 'opus',
  name: 'Nightly audit',
  nextRunAt: null,
  prompt: 'Audit dependencies',
  settingsJson: '{}',
  timeoutMs: null,
  timezone: null,
  updatedAt: '2026-07-31T00:00:00.000Z',
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule.$jobId.edit',
    loaderData: { agentClis: undefined, job, repositories: [] },
    params: { jobId: 'job-1' },
    pathname: '/schedule/job-1/edit',
  },
];

describe('routes/schedule.$jobId.edit.tsx', () => {
  test('pre-populates the form from the job', () => {
    const component = renderRoutesStub(
      <EditSchedule
        actionData={undefined}
        loaderData={{ agentClis: undefined, job, repositories: [] }}
        matches={matches}
        params={{ jobId: 'job-1' }}
      />,
    );

    expect(component.getByLabelText('Name')).toHaveValue('Nightly audit');
    expect(component.getByLabelText('Prompt')).toHaveValue(
      'Audit dependencies',
    );
    expect(
      component.getByRole('button', { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  test('surfaces an action error inline', () => {
    const component = renderRoutesStub(
      <EditSchedule
        actionData={{ error: 'settings.endpoint.apiKey is not allowed' }}
        loaderData={{ agentClis: undefined, job, repositories: [] }}
        matches={matches}
        params={{ jobId: 'job-1' }}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      /apiKey is not allowed/i,
    );
  });

  test('submitting the form posts to the route action', async () => {
    const action = vi.fn(() => ({ ok: true }));
    const component = renderRouteHarness([
      {
        Component: (): React.ReactElement => (
          <EditSchedule
            actionData={undefined}
            loaderData={{ agentClis: undefined, job, repositories: [] }}
            matches={matches}
            params={{ jobId: 'job-1' }}
          />
        ),
        action,
        path: '/',
      },
    ]);

    const user = userEvent.setup();
    await user.click(component.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
  });
});
