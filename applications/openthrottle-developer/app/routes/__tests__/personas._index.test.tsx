import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import PersonasIndex from '../personas._index';

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
          matches={[] as never}
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
