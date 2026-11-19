import { render } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';

import GeneratorDetail from '../generators.$generatorId';

const mockGenerator: GeneratorDetailCardFragment = {
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
    const component = render(
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
      component.getByRole('heading', { name: '@tools/generators' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /documentation/i }),
    ).toBeInTheDocument();
  });
});
