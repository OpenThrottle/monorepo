import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/about';
import { buildRootMatch } from '~/testing/buildRootMatch';

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
    const component = render(
      <MemoryRouter>
        <About
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      component.getByRole('heading', { name: 'About' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'OpenThrottle' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle?ref=openthrottle',
    );
    expect(
      component.getByRole('heading', { name: 'Matthew Scholta' }),
    ).toBeInTheDocument();
  });
});
