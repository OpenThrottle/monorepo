import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import PersonaDetail from '../personas.$personaId';

describe('routes/personas.$personaId.tsx', () => {
  test('renders persona detail heading', () => {
    render(
      <MemoryRouter>
        <PersonaDetail
          actionData={undefined}
          loaderData={{}}
          matches={[] as never}
          params={{ personaId: 'persona-1' }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'PersonasPersonaId' }),
    ).toBeInTheDocument();
  });
});
