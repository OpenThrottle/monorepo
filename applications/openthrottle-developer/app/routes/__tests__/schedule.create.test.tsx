import { screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/schedule.create';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { renderRoutesStub } from '~/testing/route-fixtures';

import CreateSchedule from '../schedule.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule.create',
    loaderData: { agentClis: undefined, repositories: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/schedule.create.tsx', () => {
  test('renders the schedule form in create mode', () => {
    renderRoutesStub(
      <CreateSchedule
        actionData={undefined}
        loaderData={{ agentClis: undefined, repositories: [] }}
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
        loaderData={{ agentClis: undefined, repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/are required/i);
  });
});
