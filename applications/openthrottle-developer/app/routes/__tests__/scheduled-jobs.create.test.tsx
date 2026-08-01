import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateScheduledJob from '../scheduled-jobs.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/scheduled-jobs.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/scheduled-jobs.create',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/scheduled-jobs.create.tsx', () => {
  test('renders the schedule form in create mode', () => {
    renderRoutesStub(
      <CreateScheduledJob
        actionData={undefined}
        loaderData={{}}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ScheduledJobForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Prompt')).toBeRequired();
    expect(screen.getByLabelText('Schedule (cron)')).toBeRequired();
    expect(
      screen.getByRole('button', { name: /create schedule/i }),
    ).toBeInTheDocument();
  });

  test('surfaces an action error inline', () => {
    renderRoutesStub(
      <CreateScheduledJob
        actionData={{
          error: 'Name, prompt, provider, and schedule are required.',
        }}
        loaderData={{}}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/are required/i);
  });
});
