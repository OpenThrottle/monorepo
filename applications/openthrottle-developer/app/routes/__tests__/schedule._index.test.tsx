import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../schedule._index';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';

describe('routes/schedule._index.tsx', () => {
  test('renders the schedule heading', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: SCHEDULE_EVENTS, search: '' }}
          matches={[] as never}
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
          matches={[] as never}
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
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('ScheduleEmpty')).toBeInTheDocument();
  });
});
