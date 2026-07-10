import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../schedule._index';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';
import type { Route } from '@/app/routes/+types/schedule._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/schedule._index',
    loaderData: { events: [], search: '' },
    params: {},
    pathname: '/',
  },
];

describe('routes/schedule._index.tsx', () => {
  test('renders the schedule heading', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: SCHEDULE_EVENTS, search: '' }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
  });

  test('lists the provided events', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: SCHEDULE_EVENTS, search: '' }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getAllByRole('link', { name: 'View event: Team Standup' }).length,
    ).toBeGreaterThan(0);
  });

  test('renders the empty state when there are no events', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: [], search: '' }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('ScheduleEmpty')).toBeInTheDocument();
  });
});
