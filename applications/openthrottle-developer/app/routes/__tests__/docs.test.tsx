import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../docs';
import type { Route } from '@/app/routes/+types/docs';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/docs',
    loaderData: {},
    params: {},
    pathname: '/',
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
