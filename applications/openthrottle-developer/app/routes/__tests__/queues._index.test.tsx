import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import QueuesIndex from '../queues._index';
import type { Route } from '@/app/routes/+types/queues._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/queues._index',
    loaderData: { queues: [] },
    params: {},
    pathname: '/',
  },
];

describe('routes/queues._index.tsx', () => {
  test('renders queues introduction and table', () => {
    render(
      <MemoryRouter>
        <QueuesIndex
          actionData={undefined}
          loaderData={{ queues: [] }}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Queues' })).toBeInTheDocument();
    expect(screen.getByTestId('QueuesTable')).toBeInTheDocument();
  });
});
