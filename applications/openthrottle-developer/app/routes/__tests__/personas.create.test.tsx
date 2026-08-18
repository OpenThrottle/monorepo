import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import CreatePersona from '../personas.create';
import type { Route } from '@/app/routes/+types/personas.create';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/personas.create',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

describe('routes/personas.create.tsx', () => {
  test('renders create persona heading', () => {
    render(
      <MemoryRouter>
        <CreatePersona
          actionData={undefined}
          loaderData={{}}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Create persona' }),
    ).toBeInTheDocument();
  });
});
