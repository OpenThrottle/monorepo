import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../docs.$';

function stubMatches(): React.ComponentProps<typeof Component>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/docs.$.tsx', () => {
  test('renders the doc page matching the splat path', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={{ title: 'Getting Started' }}
          matches={stubMatches()}
          params={{ '*': 'getting-started' }}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
  });
});
