import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { createTestEnv } from '@openthrottle/react-router-testing';
import Component from '../docs';
import type { Route } from '@/app/routes/+types/docs';

// The real ancestor chain for this route: root -> docs. matches is unused
// by the component under test, but its type is a fixed tuple keyed to that
// chain, so it's built out fully rather than stubbed.
const matches: Route.ComponentProps['matches'] = [
  {
    handle: undefined,
    id: 'root',
    loaderData: {
      canonical: 'http://localhost/',
      env: createTestEnv({ APP_NAME: 'openthrottle-admin' }),
      serverHealth: {
        api: 'unreachable',
        database: 'unreachable',
        redis: 'unreachable',
        websocket: 'unreachable',
      },
      user: null,
    },
    params: {},
    pathname: '/',
  },
  {
    handle: undefined,
    id: 'routes/docs',
    loaderData: {},
    params: {},
    pathname: '/docs',
  },
];

describe('routes/docs.tsx', () => {
  test('renders the docs sidebar nav from docs-content', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Getting Started' })).toHaveAttribute(
      'href',
      '/docs/getting-started',
    );
  });
});
