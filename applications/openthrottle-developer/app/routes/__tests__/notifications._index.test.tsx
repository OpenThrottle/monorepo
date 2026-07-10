import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import NotificationsIndex from '../notifications._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/notifications._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/notifications._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/notifications._index.tsx', () => {
  test('should render', () => {
    render(
      <MemoryRouter>
        <NotificationsIndex
          actionData={undefined}
          loaderData={{}}
          matches={matches}
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
