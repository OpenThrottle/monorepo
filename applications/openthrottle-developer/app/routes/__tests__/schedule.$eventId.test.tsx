import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../schedule.$eventId';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';
import { SCHEDULE_NOT_FOUND_COPY } from '~/routing/schedule/data/data.copy';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/schedule.$eventId.tsx', () => {
  test('renders the event details when the event exists', () => {
    const event = SCHEDULE_EVENTS[0];

    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ event }}
          matches={stubMatches()}
          params={{ eventId: event?.id }}
        />
      </MemoryRouter>,
    );

    expect(view.getByTestId('ScheduleEventDetails')).toBeInTheDocument();
  });

  test('renders the not-found state when the event is missing', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ event: null }}
          matches={stubMatches()}
          params={{ eventId: 'missing' }}
        />
      </MemoryRouter>,
    );

    expect(view.getByText(SCHEDULE_NOT_FOUND_COPY.title)).toBeInTheDocument();
  });
});
