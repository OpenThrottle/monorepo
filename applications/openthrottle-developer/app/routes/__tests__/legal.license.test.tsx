import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import License from '../legal.license';
import type { Route } from '@/app/routes/+types/legal.license';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/legal.license',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/legal.license.tsx', () => {
  test('should render the Apache-2.0 license heading and copy', () => {
    const view = render(
      <MemoryRouter>
        <License
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', {
        level: 1,
        name: 'License',
      }),
    ).toBeInTheDocument();
    expect(
      view.getAllByText(/Apache License, Version 2\.0/).length,
    ).toBeGreaterThan(0);
  });
});
