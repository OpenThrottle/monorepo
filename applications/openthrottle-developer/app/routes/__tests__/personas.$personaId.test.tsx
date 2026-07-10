import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import PersonaDetail from '../personas.$personaId';

function stubMatches(): React.ComponentProps<typeof PersonaDetail>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/personas.$personaId.tsx', () => {
  test('renders persona detail heading', () => {
    render(
      <MemoryRouter>
        <PersonaDetail
          actionData={undefined}
          loaderData={{
            content: '---\nname: architect\n---\n\n# Architect\n',
            persona: {
              repoRelativePath: '.agents/personas/architect.md',
              slug: 'architect',
              summary: 'Architecture lens.',
            },
          }}
          matches={stubMatches()}
          params={{ personaId: 'architect' }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'architect' }),
    ).toBeInTheDocument();
  });
});
