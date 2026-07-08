import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { createTestEnv } from '@openthrottle/react-router-testing';
import Component from '../docs.$';
import type { Route } from '@/app/routes/+types/docs.$';

// The real ancestor chain for this route: root -> docs (layout) -> docs.$.
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
    id: 'routes/docs.$',
    loaderData: { title: 'Getting Started' },
    params: { '*': 'getting-started' },
    pathname: '/docs/getting-started',
  },
];

describe('routes/docs.$.tsx', () => {
  test('renders the doc page matching the splat path', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ title: 'Getting Started' }}
          matches={matches}
          params={{ '*': 'getting-started' }}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
  });
});
