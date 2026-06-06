import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import QueuesIndex from '../queues._index';

describe('routes/queues._index.tsx', () => {
  test('renders queues introduction and table', () => {
    render(
      <MemoryRouter>
        <QueuesIndex
          actionData={undefined}
          loaderData={{ queues: [] }}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Queues' })).toBeInTheDocument();
    expect(screen.getByTestId('QueuesTable')).toBeInTheDocument();
  });
});
