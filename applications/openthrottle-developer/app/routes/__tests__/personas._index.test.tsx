import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import PersonasIndex from '../personas._index';
import type { Route } from '@/app/routes/+types/personas._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/personas._index',
    loaderData: { entries: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/personas._index.tsx', () => {
  test('renders personas page sections', () => {
    render(
      <MemoryRouter>
        <PersonasIndex
          actionData={undefined}
          loaderData={{
            entries: [
              {
                repoRelativePath: '.agents/personas/architect.md',
                slug: 'architect',
                summary: 'Architecture lens.',
              },
            ],
          }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Personas' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('PersonasToolbar')).toBeInTheDocument();
    expect(screen.getByTestId('PersonasTable')).toBeInTheDocument();
  });
});
