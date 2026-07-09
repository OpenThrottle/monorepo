import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { createTestEnv } from '@openthrottle/react-router-testing';
import Component from '../docs._index';
import type { Route } from '@/app/routes/+types/docs._index';

// The real ancestor chain for this route: root -> docs (layout) -> docs._index.
// matches is unused by the component under test, but its type is a fixed
// tuple keyed to that chain, so it's built out fully rather than stubbed.
const matches: Route.ComponentProps['matches'] = [
  {
    handle: undefined,
    id: 'root',
    loaderData: {
      canonical: 'http://localhost/',
      env: createTestEnv({ APP_NAME: 'openthrottle-email' }),
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
  {
    handle: undefined,
    id: 'routes/docs._index',
    loaderData: undefined,
    params: {},
    pathname: '/docs',
  },
];

describe('routes/docs._index.tsx', () => {
  test('renders the docs index page from docs-content/docs/index.md', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={undefined}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Mail Documentation' }),
    ).toBeInTheDocument();
  });
});
