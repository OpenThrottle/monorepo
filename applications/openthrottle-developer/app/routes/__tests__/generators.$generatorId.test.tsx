import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import GeneratorDetail from '../generators.$generatorId';

const mockGenerator: GeneratorDetailCardFragment = {
  __typename: 'GeneratorDetailObject',
  description: 'React Router scaffolding',
  name: '@tools/generators',
  schemaJson: null,
};

function stubMatches(): React.ComponentProps<typeof GeneratorDetail>['matches'];
function stubMatches(): unknown {
  return [];
}

describe('routes/generators.$generatorId.tsx', () => {
  test('renders generator heading and documentation tab', () => {
    render(
      <MemoryRouter>
        <GeneratorDetail
          actionData={undefined}
          loaderData={{ generator: mockGenerator }}
          matches={stubMatches()}
          params={{ generatorId: '@tools/generators' }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '@tools/generators' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /documentation/i }),
    ).toBeInTheDocument();
  });
});
