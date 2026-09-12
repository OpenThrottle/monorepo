import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/about';
import { buildRootMatch } from '~/testing/root-match-fixture';

import About from '../about';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/about',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/about.tsx', () => {
  test('renders about heading and primary links', () => {
    render(
      <MemoryRouter>
        <About
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OpenThrottle' })).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle?ref=openthrottle',
    );
    expect(
      screen.getByRole('heading', { name: 'Matthew Scholta' }),
    ).toBeInTheDocument();
  });
});
