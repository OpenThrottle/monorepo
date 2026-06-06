import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import CreatePersona from '../personas.create';

describe('routes/personas.create.tsx', () => {
  test('renders create persona heading', () => {
    render(
      <MemoryRouter>
        <CreatePersona
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'PersonasCreate' }),
    ).toBeInTheDocument();
  });
});
