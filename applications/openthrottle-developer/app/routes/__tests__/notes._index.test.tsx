import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import Index from '../notes._index';
import type { Route } from '@/app/routes/+types/notes._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/notes._index',
    loaderData: { notes: [], search: '' },
    params: {},
    pathname: '/',
  },
];

describe('routes/notes._index.tsx', () => {
  test('renders notes introduction and toolbar', () => {
    const view = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={{ notes: [], search: '' }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(view.getByTestId('NotesToolbar')).toBeInTheDocument();
  });
});
