import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/schedule.create';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { buildRootMatch } from '~/testing/buildRootMatch';
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
    const component = renderRoutesStub(
      <CreateSchedule
        actionData={undefined}
        loaderData={{ agentClis: undefined, repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByTestId('ScheduleForm')).toBeInTheDocument();
    expect(component.getByLabelText('Prompt')).toBeRequired();
    expect(component.getByLabelText(SCHEDULE_COPY.cronLabel)).toBeRequired();
    expect(
      component.getByRole('button', { name: /create schedule/i }),
    ).toBeInTheDocument();
  });

  test('surfaces an action error inline', () => {
    const component = renderRoutesStub(
      <CreateSchedule
        actionData={{
          error: 'Name, prompt, provider, and schedule are required.',
        }}
        loaderData={{ agentClis: undefined, repositories: [] }}
        matches={matches}
        params={{}}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent(/are required/i);
  });
});
