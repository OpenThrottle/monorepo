import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ScheduledJobsIndex from '../scheduled-jobs._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/scheduled-jobs._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/scheduled-jobs._index',
    loaderData: { jobs: [] },
    params: {},
    pathname: '/',
  },
];

const job = (
  overrides: Partial<ScheduledJobCardFragment> = {},
): ScheduledJobCardFragment => ({
  __typename: 'ScheduledAgentJobObject',
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: 'opus',
  name: 'Nightly audit',
  nextRunAt: null,
  timezone: null,
  updatedAt: '2026-07-31T00:00:00.000Z',
  ...overrides,
});

describe('routes/scheduled-jobs._index.tsx', () => {
  test('renders the table when schedules exist', () => {
    renderRoutesStub(
      <ScheduledJobsIndex
        actionData={undefined}
        loaderData={{ jobs: [job()] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ScheduledJobsTable')).toBeInTheDocument();
    expect(screen.getByText('Nightly audit')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /new schedule/i }),
    ).toBeInTheDocument();
  });

  test('renders the empty state when there are no schedules', () => {
    renderRoutesStub(
      <ScheduledJobsIndex
        actionData={undefined}
        loaderData={{ jobs: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ScheduledJobsEmpty')).toBeInTheDocument();
  });
});
