import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Component from '../docs._index';
import type { Route } from '@/app/routes/+types/docs._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/docs',
    loaderData: {},
    params: {},
    pathname: '/',
  },
  {
    handle: undefined,
    id: 'routes/docs._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/docs._index.tsx', () => {
  test('renders the docs index page from docs-content/docs/index.md', () => {
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
      view.getByRole('heading', { level: 1, name: 'Documentation' }),
    ).toBeInTheDocument();
  });
});
