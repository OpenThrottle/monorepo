import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../calendar.list';
import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';
import { CALENDAR_INTRO_COPY } from '~/routing/calendar/data/data.copy';
import type { Route } from '@/app/routes/+types/calendar.list';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/calendar.list',
    loaderData: { events: [], search: '' },
    params: {},
    pathname: '/',
  },
];

describe('routes/calendar.list.tsx', () => {
  test('renders the calendar heading', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: CALENDAR_EVENTS, search: '' }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { name: CALENDAR_INTRO_COPY.title }),
    ).toBeInTheDocument();
  });

  test('lists the provided events', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: CALENDAR_EVENTS, search: '' }}
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

    expect(view.getByTestId('CalendarEmpty')).toBeInTheDocument();
  });
});
