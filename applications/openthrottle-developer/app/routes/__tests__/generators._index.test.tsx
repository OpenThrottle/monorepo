import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../generators._index';
import type { Route } from '@/app/routes/+types/generators._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/generators._index',
    loaderData: { generators: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/generators._index.tsx', () => {
  test('renders generators heading and documentation links', () => {
    const view = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={{ generators: [] }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { name: 'Generators' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('link', { name: /AGENT_USAGE/i }),
    ).toBeInTheDocument();
  });
});
