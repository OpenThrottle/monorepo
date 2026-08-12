import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../calendar._index';
import { CALENDAR_DEMO_EVENTS } from '~/routing/calendar/data/data.calendar-demo';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/calendar._index.tsx', () => {
  test('renders the calendar month view with the loader events', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ events: CALENDAR_DEMO_EVENTS }}
          matches={stubMatches()}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
  });
});
