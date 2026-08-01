import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { ScheduledJobRunsTable } from '../ScheduledJobRunsTable';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';

const run = (
  overrides: Partial<ScheduledJobRunRowFragment> = {},
): ScheduledJobRunRowFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'run-1',
  createdAt: '2026-07-31T09:00:00.000Z',
  driverId: 'claude',
  errorMessage: null,
  exitCode: 0,
  finishedAt: '2026-07-31T09:01:23.000Z',
  id: 'run-1',
  model: 'opus',
  startedAt: '2026-07-31T09:00:00.000Z',
  status: 'succeeded',
  trigger: 'manual',
  ...overrides,
});

describe('ScheduledJobRunsTable', () => {
  test('links each row to its run detail and renders duration', () => {
    const component = renderRoutesStub(
      <ScheduledJobRunsTable
        jobId="job-1"
        runs={[
          run(),
          run({ finishedAt: null, id: 'run-2', status: 'running' }),
        ]}
      />,
    );

    const viewLinks = component.getAllByRole('link', { name: /view/i });
    expect(viewLinks[0]).toHaveAttribute(
      'href',
      '/scheduled-jobs/job-1/runs/run-1',
    );
    expect(viewLinks[1]).toHaveAttribute(
      'href',
      '/scheduled-jobs/job-1/runs/run-2',
    );
    // finished run -> computed duration; unfinished -> em dash
    expect(component.getByText('1m 23s')).toBeInTheDocument();
  });

  test('exposes the error message as a tooltip on the failed status', () => {
    const component = renderRoutesStub(
      <ScheduledJobRunsTable
        jobId="job-1"
        runs={[run({ errorMessage: 'kaboom', status: 'failed' })]}
      />,
    );

    expect(component.getByText('failed')).toHaveAttribute('title', 'kaboom');
  });
});
