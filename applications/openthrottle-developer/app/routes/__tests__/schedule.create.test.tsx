import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CreateSchedule from '../schedule.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';
import type { Route } from '@/app/routes/+types/schedule.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule.create',
    loaderData: { repositories: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/schedule.create.tsx', () => {
  test('renders the schedule form in create mode', () => {
    renderRoutesStub(
      <CreateSchedule
        actionData={undefined}
        loaderData={{ repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByTestId('ScheduleForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Prompt')).toBeRequired();
    expect(screen.getByLabelText('Schedule (cron)')).toBeRequired();
    expect(
      screen.getByRole('button', { name: /create schedule/i }),
    ).toBeInTheDocument();
  });

  test('surfaces an action error inline', () => {
    renderRoutesStub(
      <CreateSchedule
        actionData={{
          error: 'Name, prompt, provider, and schedule are required.',
        }}
        loaderData={{ repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/are required/i);
  });
});
