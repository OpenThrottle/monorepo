import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { createTestEnv } from '@openthrottle/react-router-testing';
import Component from '../faq._index';
import type { Route } from '@/app/routes/+types/faq._index';

// The real ancestor chain for this route: root -> faq._index. matches is
// unused by the component under test, but its type is a fixed tuple keyed
// to that chain, so it's built out fully rather than stubbed.
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
    id: 'routes/faq._index',
    loaderData: undefined,
    params: {},
    pathname: '/faq',
  },
];

describe('routes/faq._index.tsx', () => {
  test('renders the FAQ heading and questions from docs-content', () => {
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
      view.getByRole('heading', {
        level: 1,
        name: 'Frequently asked questions',
      }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'How do I compose a message?' }),
    ).toBeInTheDocument();
  });
});
