import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/personas._index';
import { buildRootMatch } from '~/testing/buildRootMatch';

import PersonasIndex from '../personas._index';

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
    const component = render(
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
      component.getByRole('heading', { name: 'Personas' }),
    ).toBeInTheDocument();
    expect(component.getByTestId('PersonasToolbar')).toBeInTheDocument();
    expect(component.getByTestId('PersonasTable')).toBeInTheDocument();
  });
});
