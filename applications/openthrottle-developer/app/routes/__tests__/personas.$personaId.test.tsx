import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import PersonaDetail from '../personas.$personaId';

function stubMatches(): React.ComponentProps<typeof PersonaDetail>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/personas.$personaId.tsx', () => {
  test('renders persona detail heading', () => {
    const component = render(
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
      component.getByRole('heading', { name: 'architect' }),
    ).toBeInTheDocument();
  });
});
