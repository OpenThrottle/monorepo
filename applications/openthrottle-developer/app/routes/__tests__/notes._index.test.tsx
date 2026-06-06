import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Index from '../notes._index';

describe('routes/notes._index.tsx', () => {
  test('renders notes introduction and toolbar', () => {
    const view = render(
      <MemoryRouter>
        <Index
          actionData={undefined}
          loaderData={{ notes: [], search: '' }}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(view.getByTestId('NotesToolbar')).toBeInTheDocument();
  });
});
