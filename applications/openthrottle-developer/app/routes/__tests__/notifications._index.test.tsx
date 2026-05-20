import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import NotificationsIndex from '../notifications._index';

describe('routes/notifications._index.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <NotificationsIndex
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Notifications' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Event subscriptions' }),
    ).toBeInTheDocument();
  });
});
